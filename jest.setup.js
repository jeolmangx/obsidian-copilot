import "web-streams-polyfill/dist/polyfill.min.js";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof MessagePort === 'undefined') {
  global.MessagePort = class MessagePort {};
}
