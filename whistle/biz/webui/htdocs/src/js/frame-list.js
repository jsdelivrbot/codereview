var React = require('react');
var ReactDOM = require('react-dom');
var util = require('./util');
var FilterInput = require('./filter-input');
var DropDown = require('./dropdown');
var dataCenter = require('./data-center');
var events = require('./events');

var SEND_PERATORS = [
  {
    value: 0,
    icon: 'arrow-right',
    text: 'Send'
  },
  {
    value: 1,
    icon: 'arrow-right',
    text: 'Pause'
  },
  {
    value: 2,
    icon: 'arrow-right',
    text: 'Ignore'
  }
];
var RECEIVE_PERATORS = [
  {
    value: 0,
    icon: 'arrow-left',
    text: 'Receive'
  },
  {
    value: 1,
    icon: 'arrow-left',
    text: 'Pause'
  },
  {
    value: 2,
    icon: 'arrow-left',
    text: 'Ignore'
  }
];

var FrameList = React.createClass({
  getInitialState: function() {
    return {};
  },
  onFilterChange: function(keyword) {
    this.props.modal.search(keyword);
    this.setState({ keyword: keyword.trim() });
  },
  componentDidMount: function() {
    events.on('autoRefreshFrames', this.autoRefresh);
  },
  onDoubleClick: function() {
    events.trigger('showFrameTextView');
  },
  componentWillUpdate: function() {
    this.atBottom = this.shouldScrollToBottom();
  },
  componentDidUpdate: function() {
    if (this.atBottom) {
      this.autoRefresh();
    }
  },
  replay: function() {
    var reqData = this.props.reqData;
    if (!reqData || reqData.closed || reqData.err) {
      this.autoRefresh();
      return;
    }
    events.trigger('replayFrame', this.props.modal.getActive());
  },
  stopRefresh: function() {
    this.container.scrollTop = this.container.scrollTop - 10;
  },
  autoRefresh: function() {
    this.container.scrollTop = 100000000;
  },
  clear: function() {
    this.props.modal.clear();
    this.setState({});
    if (this.props.onUpdate) {
      this.props.onUpdate();
    }
  },
  compose: function() {
    events.trigger('composeFrame', this.props.modal.getActive());
  },
  checkActive: function() {
    var reqData = this.props.reqData;
    if (!reqData || reqData.closed || reqData.err) {
      this.autoRefresh();
      return;
    }
    return reqData;
  },
  abort: function() {
    var self = this;
    var reqData = this.checkActive();
    if (!reqData) {
      return;
    }
    dataCenter.socket.abort({
      reqId: reqData.id
    }, function(data, xhr) {
      if (!data) {
        util.showSystemError(xhr);
      } else {
        reqData.closed = true;
        self.autoRefresh();
      }
    });
  },
  changeStatus: function(reqData, option, isSend) {
    var self = this;
    var params = {
      reqId: reqData.id
    };
    if (isSend) {
      params.sendStatus = option.value;
    } else {
      params.receiveStatus = option.value;
    }
    dataCenter.socket.changeStatus(params, function(data, xhr) {
      if (!data) {
        util.showSystemError(xhr);
      } else {
        if (isSend) {
          reqData.sendStatus = option.value;
        } else {
          reqData.receiveStatus = option.value;
        }
        self.setState({});
      }
    });
  },
  onSendStatusChange: function(option) {
    var reqData = this.checkActive();
    if (!reqData) {
      return;
    }
    this.changeStatus(reqData, option, true);
  },
  onReceiveStatusChange: function(option) {
    var reqData = this.checkActive();
    if (!reqData) {
      return;
    }
    this.changeStatus(reqData, option);
  },
  onClear: function(e) {
    if ((e.ctrlKey || !e.metaKey) && e.keyCode === 88) {
      this.clear();
    }
  },
  shouldScrollToBottom: function() {
    var con = this.container;
    var ctn =this.content;
    var modal = this.props.modal;
    var atBottom = con.scrollTop + con.offsetHeight + 5 > ctn.offsetHeight;
    if (atBottom) {
      modal.update();
    }
    return atBottom;
  },
  setContainer: function(container) {
    this.container = ReactDOM.findDOMNode(container);
  },
  setContent: function(content) {
    this.content = ReactDOM.findDOMNode(content);
  },
  render: function() {
    var self = this;
    var props = self.props;
    var state = this.state;
    var reqData = props.reqData || '';
    var onClickFrame = props.onClickFrame;
    var modal = self.props.modal;
    var keyword = state.keyword;
    var activeItem = modal.getActive();
    var list = modal.getList();
    if (!reqData.closed) {
      var lastItem = list[list.length - 1];
      if (lastItem && (lastItem.closed || lastItem.err)) {
        reqData.closed = true;
      }
    }
    return (<div className="fill orient-vertical-box w-frames-list">
      <FilterInput onChange={self.onFilterChange} />
      <div className="w-frames-action">
        <a onClick={self.clear} className="w-remove-menu"
          href="javascript:;" draggable="false">
          <span className="glyphicon glyphicon-remove"></span>Clear
        </a>
        <a onClick={self.autoRefresh} onDoubleClick={self.stopRefresh} className="w-remove-menu"
          href="javascript:;" draggable="false">
          <span className="glyphicon glyphicon-play"></span>AutoRefresh
        </a>
        <a onClick={self.replay} className={'w-remove-menu' + ((!activeItem || reqData.closed) ? ' w-disabled' : '')}
          href="javascript:;" draggable="false">
          <span className="glyphicon glyphicon-repeat"></span>Replay
        </a>
        <a onClick={self.compose} className={'w-remove-menu' + (activeItem ? '' : ' w-disabled')}
          href="javascript:;" draggable="false">
          <span className="glyphicon glyphicon-edit"></span>Composer
        </a>
        <a onClick={self.abort} className={'w-remove-menu' + (reqData.closed ? ' w-disabled' : '')}
          href="javascript:;" draggable="false">
          <span className="glyphicon glyphicon-ban-circle"></span>Abort
        </a>
        <DropDown
          disabled={reqData.closed}
          value={reqData.sendStatus || 0}
          onChange={self.onSendStatusChange}
          options={SEND_PERATORS}
        />
        <DropDown
          disabled={reqData.closed}
          value={reqData.receiveStatus || 0}
          onChange={self.onReceiveStatusChange}
          options={RECEIVE_PERATORS}
        />
      </div>
      <div
        tabIndex="0"
        onKeyDown={this.onClear}
        style={{background: keyword ? '#ffffe0' : undefined}}
        onScroll={self.shouldScrollToBottom} ref={self.setContainer} className="fill w-frames-list">
        <ul ref={self.setContent}>
          {list.map(function(item) {
            var statusClass = '';
            if (item.closed || item.err) {
              reqData.closed = item.closed;
              reqData.err = item.err;
              if (item.closed) {
                statusClass = ' w-connection-closed';
              } else {
                statusClass = ' w-connection-error';
              }
              item.title = item.title || 'Date: ' + new Date(parseInt(item.frameId, 10)).toLocaleString();
            }
            if (item.data == null) {
              item.data = util.getBody(item, true);
              if (item.data.length > 500) {
                item.data = item.data.substring(0, 500) + '...';
              }
            }
            if (!item.title && !item.closed) {
              item.title = 'Date: ' + new Date(parseInt(item.frameId, 10)).toLocaleString()
               + '\nFrom: ' + (item.isClient ? 'Client' : 'Server');
              if (item.opcode) {
                item.title += '\nOpcode: ' + item.opcode;
                item.title += '\nType: ' + (item.opcode == 1 ? 'Text' : 'Binary');
              }
              if (item.compressed) {
                item.title += '\nCompressed: ' + item.compressed;
              }
              if (item.mask) {
                item.title += '\nMask: ' + item.mask;
              }
              var length = item.length;
              if (length >= 0) {
                if (length >= 1024) {
                  length += '(' + Number(length / 1024).toFixed(2) + 'k)';
                }
                item.title += '\nLength: ' + length;
              }
            }
            var icon = 'arrow-left';
            if (item.closed) {
              icon = 'minus-sign';
            } else if (item.isClient) {
              icon = 'arrow-right';
            }
            return (
              <li
                key={item.frameId}
                title={item.title}
                style={{display: item.hide ? 'none' : undefined}}
                onClick={function() {
                  onClickFrame && onClickFrame(item);
                }}
                onDoubleClick={self.onDoubleClick}
                className={(item.isClient ? 'w-frames-send' : '') + (item.ignore ? ' w-frames-ignore' : '')
                  + (item.active ? '  w-frames-selected' : '') + statusClass}>
                <span className={'glyphicon glyphicon-' + icon}></span>
                {item.data}
              </li>
            );
          })}
        </ul>
      </div>
    </div>);
  }
});

module.exports = FrameList;
