import './style.css';
import { BreadboardApp } from './ui/breadboard-app';

// Initialize the application
const appElement = document.getElementById('app');
if (appElement) {
  new BreadboardApp(appElement);
} else {
  console.error('App element not found');
}
