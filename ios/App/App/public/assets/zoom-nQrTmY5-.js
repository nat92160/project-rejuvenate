import{c as a}from"./index-DG4DlzXB.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=a("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]),f="https://www.chabbat-chalom.com/zoom-callback",o="zoom_pkce_verifier";function n(e){const r=new Uint8Array(e);let t="";for(const c of r)t+=String.fromCharCode(c);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function g(){const e=new Uint8Array(32);return crypto.getRandomValues(e),n(e.buffer)}async function l(e){const r=new TextEncoder,t=await crypto.subtle.digest("SHA-256",r.encode(e));return n(t)}function m(e){sessionStorage.setItem(o,e)}function u(){const e=sessionStorage.getItem(o);return e&&sessionStorage.removeItem(o),e}export{i as C,f as Z,l as a,u as c,g,m as s};
