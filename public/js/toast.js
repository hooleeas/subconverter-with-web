// 全站统一弹窗（CC 字幕式小横条）：一个函数，需要时调用。
// 顶部偏下 64px，实色不透明，2.4 秒自动消失；字加大一倍。
// 自带样式，不依赖页面 CSS，首页 / 管理 / 聚合页通用。
// 用 popover（顶层）显示，优先级最高，任何弹窗/遮罩都盖不住它。
let _toastEl=null,_toastTimer=null;
function showToast(message){
if(!_toastEl){
_toastEl=document.createElement('div');
_toastEl.setAttribute('popover','manual');
_toastEl.setAttribute('role','status');
_toastEl.setAttribute('aria-live','polite');
_toastEl.hidden=true;
const s=_toastEl.style;
s.position='fixed';
s.left='50%';
s.top='64px';
s.bottom='auto';
s.margin='0';
s.transform='translateX(-50%)';
s.zIndex='9999';
s.maxWidth='90vw';
s.padding='8px 16px';
s.border='none';s.outline='none';
s.fontSize='16px';
s.fontWeight='bold';
s.borderRadius='12px';
document.body.appendChild(_toastEl);
}
const _dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
_toastEl.style.background=_dark?'rgba(255,255,255,0.6)':'rgba(0,0,0,0.6)';
_toastEl.style.color=_dark?'#111':'#fff';
_toastEl.textContent=message;
clearTimeout(_toastTimer);
_toastEl.hidden=false;
if(typeof _toastEl.showPopover==='function'&&!_toastEl.matches(':popover-open')){
try{_toastEl.showPopover()}catch{}
}
_toastTimer=setTimeout(()=>{try{if(_toastEl.matches(':popover-open'))_toastEl.hidePopover()}catch{}_toastEl.hidden=true},2400);
}
