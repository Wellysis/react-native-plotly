import * as React from 'react';
import { StyleSheet, WebView, Platform } from 'react-native';
import PlotlyLib from './lib/PlotlyBasic';
import { getDiff } from './diff';
/*
Base 64 encode source code
Postmessage source code into webview
Webview decodes and evals
Plotly is now in the window!
*/
const IOS_PLOTLY_LOAD_TIME = 1000;
const errorHandlerFn = `
  window.onerror = function(message, source, lineno, colno, error) {
    document.getElementById('error').innerHTML += message + '\\n';
  };
`;
const postMessageHandler = `
  document.addEventListener(
    'message',
    function(event) {
      const decoded = atob(event.data);
      eval(decoded);
    },
    false
  );
`;
const debugFn = `
  window.DEBUG = function(message) {
    document.getElementById('debug').innerHTML += message + '\\n';
  };
`;
class Plotly extends React.Component {
  constructor() {
    super(...arguments);
    this.chart = React.createRef();
    this.html = `
    <html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style type="text/css">
        body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
        }
        #chart {
          width: 100vw;
          height: 100vh;
        }
        #error {
          position: fixed;
          top: 10vh;
          max-width: 100vw;
          max-height: 40vh;
          overflow-y: scroll;
          background: pink;
          white-space: pre-wrap;
        }
        #debug {
          position: fixed;
          top: 50vh;
          max-width: 100vw;
          max-height: 40vh;
          overflow-y: scroll;
          background: #eaeaea;
          white-space: pre-wrap;
          zIndex: 1000;
        }
        </style>
    </head>
    
    <body >
      <div id="chart"></div>
      <pre id="error"></pre>
      <pre id="debug"></pre>
    </body>
  
    <script>
      /* This only runs on iOS, on android it is posted */
      ${errorHandlerFn}
      ${debugFn}
      ${postMessageHandler}
    </script>
    </html>
    `;
    this.debug = msg => {
      this.invoke(
        `document.getElementById('debug').innerHTML += \`${msg}\` + '\\n';`
      );
    };
    this.invoke = str => {
      if (this.chart && this.chart.current)
        this.chart.current.injectJavaScript(`(function(){${str}})()`);
    };
    this.invokeEncoded = str => {
      if (this.chart && this.chart.current) this.chart.current.postMessage(str);
    };
    this.initialPlot = (data, layout, config) => {
      this.invoke(`
        window.Plotly.newPlot(
          'chart',
          ${JSON.stringify(data)},
          ${JSON.stringify(layout)},
          ${JSON.stringify(config)}
        );
      `);
    };
    this.plotlyReact = (data, layout, config) => {
      this.invoke(`
        window.Plotly.react(
          'chart',
          ${JSON.stringify(data)},
          ${JSON.stringify(layout)},
          ${JSON.stringify(config)}
        );
      `);
    };
    this.plotlyRelayout = layout => {
      this.invoke(`
        window.Plotly.relayout(
          'chart',
          ${JSON.stringify(layout)}
        );
      `);
    };
    this.plotlyRestyle = (data, i) => {
      this.invoke(`
        window.Plotly.restyle(
          'chart',
          ${JSON.stringify(data)},
          ${i}
        );
      `);
    };
    this.webviewLoaded = () => {
      if (Platform.OS === 'android') {
        // On iOS these are included a <script> tag
        this.invoke(errorHandlerFn);
        this.invoke(postMessageHandler);
        if (this.props.debug) {
          this.invoke(debugFn);
        }
      }
      // Load plotly
      this.invokeEncoded(PlotlyLib);
      const { data, config, layout } = this.props;
      this.initialPlot(data, layout, config);
    };
  }
  componentDidMount() {
    if (Platform.OS === 'ios')
      setTimeout(this.webviewLoaded, IOS_PLOTLY_LOAD_TIME);
  }
  shouldComponentUpdate(nextProps) {
    if (this.props.update) {
      // Let the user call the update functions
      this.props.update(
        {
          data: this.props.data,
          layout: this.props.layout,
          config: this.props.config,
        },
        {
          data: nextProps.data,
          layout: nextProps.layout,
          config: nextProps.config,
        },
        {
          react: this.plotlyReact,
          relayout: this.plotlyRelayout,
          restyle: this.plotlyRestyle,
        }
      );
    } else {
      // Default, just use Plotly.react
      const dataDiff = getDiff(this.props.data, nextProps.data);
      if (Array.isArray(dataDiff)) {
        dataDiff.forEach((d, i) => {
          if (d) this.plotlyRestyle(d, i);
        });
      }
      const layoutDiff = getDiff(this.props.layout, nextProps.layout);
      if (layoutDiff) this.plotlyRelayout(layoutDiff);
    }
    return false;
  }
  render() {
    return (
      <WebView
        ref={this.chart}
        source={{ html: this.html }}
        style={styles.container}
        onLoad={this.webviewLoaded}
      />
    );
  }
}
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});
export default Plotly;
//# sourceMappingURL=plotly.js.map
