import type { Theme } from 'theme-ui';

const fonts = {
  body: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  heading:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  monospace:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

export const theme: Theme = {
  config: {
    initialColorModeName: 'dark',
    useColorSchemeMediaQuery: false,
  },
  fonts,
  fontSizes: [12, 14, 16, 18, 20, 24, 28, 32],
  lineHeights: {
    body: 1.6,
    heading: 1.2,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 16,
    pill: 9999,
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.12)',
    md: '0 4px 12px rgba(0,0,0,0.24)',
  },
  colors: {
    text: '#e0e0e0',
    background: '#1a1a1a',
    primary: '#4488ff',

    headerBg: '#2c2c2c',
    sidebarBg: '#2c2c2c',
    panelBg: '#3c3c3c',
    border: '#4c4c4c',
    hoverBg: '#4c4c4c',
    inputBg: '#3c3c3c',
    modalBg: '#2c2c2c',
    secondaryText: '#999',

    workspaceBg: '#2c2c2c',

    bb: {
      plasticBase: '#2c3137',
      plasticHighlight: '#3a4149',
      plasticShadow: '#171b20',

      panelSlightDark: '#242a31',
      panelSlightLight: '#323943',

      trenchBase: '#232a31',
      trenchShadow: '#161b20',

      holeBevelLight: '#454c55',
      holeBevelMid: '#232a31',
      holeCavity: '#0b0d10',
      holeCavityEdge: '#07090b',

      printDark: '#e6e9ee',
      printMid: '#b3bcc6',

      railRed: '#ff5c5c',
      railBlue: '#4b83ff',

      hoverFill: '#4aa3ff',
      outlineShadow: '#000000',
    },

    modes: {
      light: {
        text: '#2c2c2c',
        background: '#f5f5f5',
        primary: '#4488ff',

        headerBg: '#ffffff',
        sidebarBg: '#ffffff',
        panelBg: '#f8f8f8',
        border: '#dddddd',
        hoverBg: '#e8e8e8',
        inputBg: '#ffffff',
        modalBg: '#ffffff',
        secondaryText: '#666666',

        workspaceBg: '#f3f4f6',

        bb: {
          plasticBase: '#f2f3f5',
          plasticHighlight: '#ffffff',
          plasticShadow: '#d9dde2',

          panelSlightDark: '#e7eaee',
          panelSlightLight: '#f7f8fa',

          trenchBase: '#e8edf2',
          trenchShadow: '#d6dde5',

          holeBevelLight: '#f7f7f7',
          holeBevelMid: '#c7ccd2',
          holeCavity: '#2a2f35',
          holeCavityEdge: '#1f2328',

          printDark: '#2f343a',
          printMid: '#555c64',

          railRed: '#d23b3b',
          railBlue: '#1f5fbf',

          hoverFill: '#3399ff',
          outlineShadow: '#000000',
        },
      },
    },
  },
  styles: {
    root: {
      fontFamily: 'body',
      lineHeight: 'body',
      color: 'text',
      bg: 'background',
    },
  },
};
