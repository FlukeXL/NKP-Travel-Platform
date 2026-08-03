const window = {};
window.MNX_API = { baseUrl: 'http://localhost:4000/api' };
function mnxResolveUploadUrl(url) {
  if (!url || !url.startsWith('/uploads/')) return url;
  const apiOrigin = (window.MNX_API && window.MNX_API.baseUrl) ? window.MNX_API.baseUrl.replace(/\/api\/?$/, '') : '';
  return `${apiOrigin}${url}`;
}
console.log(mnxResolveUploadUrl('/uploads/1785246579260-686487670.png'));
