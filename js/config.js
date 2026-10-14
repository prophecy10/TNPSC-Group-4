/* config.js — site settings */
// Private visit counter (GoatCounter: free, no cookies, no personal data; only you can log in to see the numbers).
// Leave empty to disable. Set to your GoatCounter site code, e.g. 'tnpsc-g4' for https://tnpsc-g4.goatcounter.com
const GOATCOUNTER_CODE = '';

if (GOATCOUNTER_CODE && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
}
