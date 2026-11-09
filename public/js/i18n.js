// Shared i18n: Chinese / English / Persian. Loaded by homepage, admin and portal.
(function(){
var LANGS=[{code:"zh",label:"中文"},{code:"en",label:"English"},{code:"fa",label:"فارسی"}];
var I18N={
zh:{
lang_title:"选择语言",translate:"翻译",home_title:"订阅转换",home_subtitle:"聚合多个订阅源，一键转换六种客户端格式",home_formats:"支持 Base64、Clash、sing-box、Surge、Loon、Quantumult X",home_github:"获取同款项目",portal_note1:"点「导入」直接将本链接导入对应客户端；点「显示二维码」用客户端扫码导入；点「复制」复制链接后自行导入",portal_note2:"自适应订阅地址可直接导入任意支持 URL 导入的客户端",
backend_version:"后端版本",sources:"订阅源",name:"名称",exclude:"排除节点",expires:"过期时间",
expires_off:"未启用",expires_on:"已启用",h1:"1小时",h24:"24小时",d7:"7天",d30:"30天",
custom_path:"自定义链接路径",random_uuid:"随机 UUID",generate:"生成聚合订阅链接",
ph_sources:"每行一个节点链接或订阅地址，例如：vless://... 或 https://...",
ph_name:"例如：张三的订阅",ph_exclude:"每行一个关键词，例如：广告",
ph_path:"例如：550e8400-e29b-41d4-a716-446655440000",
nav_home:"首页",nav_sub:"订阅",nav_data:"数据",nav_config:"配置",nav_site:"站点",
sec_groups:"订阅分组",sec_self:"自用订阅",add_group:"添加分组",add_self:"添加订阅",
sec_backup:"备份与迁移",export_btn:"导出",clear_btn:"清空数据",import_btn:"导入",sec_links:"订阅链接",
def_backend:"默认 SUBAPI",list_backend:"SUBAPI列表",add_backend:"添加 SUBAPI",
def_rule:"默认 SUBCONFIG",list_rule:"SUBCONFIG列表",add_rule:"添加规则选项",
site_path:"管理面板路径",save_path:"保存路径",site_title:"首页标题",site_icon:"网站图标",save_title:"保存标题",save_icon:"保存图标",
site_account:"管理员账号设置",admin_user:"管理员账号",admin_pass:"管理员密码",new_pass:"新密码（至少 8 位）",save_account:"保存账号密码",
dlg_add_option:"添加选项",dlg_edit_backend:"编辑 SUBAPI",dlg_edit_rule:"编辑规则选项",
dlg_add_group:"添加分组",dlg_edit_group:"编辑分组",dlg_edit_self:"编辑自用订阅",dlg_create_self:"创建订阅链接",
dlg_name:"备注",dlg_url:"URl",dlg_link_name:"链接名称",dlg_link_path:"订阅链接路径",
dlg_group_name:"分组名称",dlg_group_src:"上游链接",save:"保存",save_edit:"保存修改",
ph_remark:"填写备注",ph_group_name:"例如：Fam",ph_self_name:"例如：我的主订阅",
ph_group_src:"每行一个订阅地址",ph_path_hint:"留空自动生成 UUID",
portal_title_suffix:"聚合订阅",portal_adaptive:"自适应订阅地址",
fmt_base64:"Base64",fmt_clash:"Clash",fmt_singbox:"sing-box",fmt_surge:"Surge",fmt_loon:"Loon",fmt_quanx:"Quantumult X",
import_btn:"导入",jump:"跳转",qr_show:"显示二维码",qr_hide:"隐藏二维码",copy:"复制",qr_label:"二维码",
toast_copied:"已复制",toast_lang_na:"翻译功能尚未开放",edit:"编辑",delete:"删除",upstream_links:"个上游链接",self_default:"自用订阅",self_suffix:"（自用）",visitor:"访客订阅",expired_tpl:" · 已过期（{date}）",valid_tpl:" · 有效期至 {date}",
hint_path:"留空自动生成 UUID；可直接输入自定义路径，或点击按钮反复生成。"
},
en:{
lang_title:"Language",translate:"Translate",home_title:"Subscription Converter",home_subtitle:"Aggregate multiple subscription sources and convert to six client formats with one click",home_formats:"Supports Base64, Clash, sing-box, Surge, Loon, and Quantumult X",home_github:"Get the same project",portal_note1:"Tap Import to add this link to the matching client, Show QR Code to scan it with your client, or Copy to copy the link and import it yourself",portal_note2:"The adaptive subscription address can be imported directly into any client that supports URL import",
backend_version:"Backend Version",sources:"Subscription Sources",name:"Name",exclude:"Exclude Nodes",expires:"Expiry",
expires_off:"Disabled",expires_on:"Enabled",h1:"1 hour",h24:"24 hours",d7:"7 days",d30:"30 days",
custom_path:"Custom Link Path",random_uuid:"Random UUID",generate:"Generate Aggregate Link",
ph_sources:"One node link or subscription URL per line, e.g. vless://... or https://...",
ph_name:"e.g. My main subscription",ph_exclude:"One keyword per line, e.g. ad",
ph_path:"e.g. 550e8400-e29b-41d4-a716-446655440000",
nav_home:"Home",nav_sub:"Subscriptions",nav_data:"Data",nav_config:"Config",nav_site:"Site",
sec_groups:"Subscription Groups",sec_self:"My Subscriptions",add_group:"Add Group",add_self:"Add Subscription",
sec_backup:"Backup & Migration",export_btn:"Export",clear_btn:"Clear Data",import_btn:"Import",sec_links:"Subscription Links",
def_backend:"Default SUBAPI",list_backend:"SUBAPI List",add_backend:"Add SUBAPI",
def_rule:"Default SUBCONFIG",list_rule:"SUBCONFIG List",add_rule:"Add Rule Option",
site_path:"Admin Panel Path",save_path:"Save Path",site_title:"Home Title",site_icon:"Site Icon",save_title:"Save Title",save_icon:"Save Icon",
site_account:"Admin Account Settings",admin_user:"Admin Username",admin_pass:"Admin Password",new_pass:"New Password (min 8 chars)",save_account:"Save Account",
dlg_add_option:"Add Option",dlg_edit_backend:"Edit SUBAPI",dlg_edit_rule:"Edit Rule Option",
dlg_add_group:"Add Group",dlg_edit_group:"Edit Group",dlg_edit_self:"Edit My Subscription",dlg_create_self:"Create Subscription Link",
dlg_name:"Note",dlg_url:"URL",dlg_link_name:"Link Name",dlg_link_path:"Subscription Link Path",
dlg_group_name:"Group Name",dlg_group_src:"Upstream Links",save:"Save",save_edit:"Save Changes",
ph_remark:"Enter a note",ph_group_name:"e.g. Fam",ph_self_name:"e.g. My main subscription",
ph_group_src:"One subscription URL per line",ph_path_hint:"Leave empty to auto-generate a UUID",
portal_title_suffix:"Aggregate Subscription",portal_adaptive:"Adaptive Subscription Address",
fmt_base64:"Base64",fmt_clash:"Clash",fmt_singbox:"sing-box",fmt_surge:"Surge",fmt_loon:"Loon",fmt_quanx:"Quantumult X",
import_btn:"Import",jump:"Open",qr_show:"Show QR Code",qr_hide:"Hide QR Code",copy:"Copy",qr_label:"QR Code",
toast_copied:"Copied",toast_lang_na:"Translation is not available yet",edit:"Edit",delete:"Delete",upstream_links:"upstream links",self_default:"My Subscription",self_suffix:" (My)",visitor:"Visitor Subscription",expired_tpl:" · Expired ({date})",valid_tpl:" · Valid until {date}",
hint_path:"Leave empty to auto-generate a UUID; or enter a custom path, or click the button to generate one."
},
fa:{
lang_title:"انتخاب زبان",translate:"ترجمه",home_title:"مبدل اشتراک",home_subtitle:"چندین منبع اشتراک را تجمیع کنید و با یک کلیک به شش قالب کلاینت تبدیل کنید",home_formats:"پشتیبانی از Base64، Clash، sing-box، Surge، Loon و Quantumult X",home_github:"دریافت همین پروژه",portal_note1:"روی «ورودی» بزنید تا این پیوند مستقیم به کلاینت مربوطه اضافه شود؛ روی «نمایش کد QR» بزنید تا با کلاینت اسکن کنید؛ روی «کپی» بزنید تا پیوند را کپی کرده و خودتان وارد کنید",portal_note2:"آدرس اشتراک تطبیقی را می‌توان مستقیم به هر کلاینتی که از وارد کردن URL پشتیبانی می‌کند وارد کرد",
backend_version:"نسخه بک‌اند",sources:"منابع اشتراک",name:"نام",exclude:"حذف گره‌ها",expires:"زمان انقضا",
expires_off:"غیرفعال",expires_on:"فعال",h1:"۱ ساعت",h24:"۲۴ ساعت",d7:"۷ روز",d30:"۳۰ روز",
custom_path:"مسیر لینک سفارشی",random_uuid:"UUID تصادفی",generate:"ایجاد لینک تجمیعی",
ph_sources:"در هر خط یک لینک گره یا آدرس اشتراک، مثال: vless://... یا https://...",
ph_name:"مثال: اشتراک اصلی من",ph_exclude:"در هر خط یک کلمه کلیدی، مثال: تبلیغات",
ph_path:"مثال: 550e8400-e29b-41d4-a716-446655440000",
nav_home:"خانه",nav_sub:"اشتراک‌ها",nav_data:"داده‌ها",nav_config:"تنظیمات",nav_site:"سایت",
sec_groups:"گروه‌های اشتراک",sec_self:"اشتراک‌های من",add_group:"افزودن گروه",add_self:"افزودن اشتراک",
sec_backup:"پشتیبان‌گیری و مهاجرت",export_btn:"خروجی",clear_btn:"پاک کردن داده‌ها",import_btn:"ورودی",sec_links:"لینک‌های اشتراک",
def_backend:"SUBAPI پیش‌فرض",list_backend:"فهرست SUBAPI",add_backend:"افزودن SUBAPI",
def_rule:"SUBCONFIG پیش‌فرض",list_rule:"فهرست SUBCONFIG",add_rule:"افزودن گزینه قانون",
site_path:"مسیر پنل مدیریت",save_path:"ذخیره مسیر",site_title:"عنوان صفحه اصلی",site_icon:"نماد سایت",save_title:"ذخیره عنوان",save_icon:"ذخیره نماد",
site_account:"تنظیمات حساب مدیر",admin_user:"نام کاربری مدیر",admin_pass:"رمز عبور مدیر",new_pass:"رمز عبور جدید (حداقل ۸ کاراکتر)",save_account:"ذخیره حساب",
dlg_add_option:"افزودن گزینه",dlg_edit_backend:"ویرایش SUBAPI",dlg_edit_rule:"ویرایش گزینه قانون",
dlg_add_group:"افزودن گروه",dlg_edit_group:"ویرایش گروه",dlg_edit_self:"ویرایش اشتراک من",dlg_create_self:"ایجاد لینک اشتراک",
dlg_name:"یادداشت",dlg_url:"لینک",dlg_link_name:"نام لینک",dlg_link_path:"مسیر لینک اشتراک",
dlg_group_name:"نام گروه",dlg_group_src:"لینک‌های منبع",save:"ذخیره",save_edit:"ذخیره تغییرات",
ph_remark:"یادداشت را وارد کنید",ph_group_name:"مثال: Fam",ph_self_name:"مثال: اشتراک اصلی من",
ph_group_src:"در هر خط یک آدرس اشتراک",ph_path_hint:"خالی بگذارید تا UUID به‌صورت خودکار ایجاد شود",
portal_title_suffix:"اشتراک تجمیعی",portal_adaptive:"آدرس اشتراک تطبیقی",
fmt_base64:"Base64",fmt_clash:"Clash",fmt_singbox:"sing-box",fmt_surge:"Surge",fmt_loon:"Loon",fmt_quanx:"Quantumult X",
import_btn:"وارد کردن",jump:"باز کردن",qr_show:"نمایش کد QR",qr_hide:"پنهان کردن کد QR",copy:"کپی",qr_label:"کد QR",
toast_copied:"کپی شد",toast_lang_na:"ترجمه هنوز در دسترس نیست",
hint_path:"خالی بگذارید تا UUID به‌صورت خودکار ایجاد شود؛ یا مسیر سفارشی وارد کنید، یا روی دکمه کلیک کنید تا ایجاد شود.",
edit:"ویرایش",delete:"حذف",upstream_links:"لینک‌های منبع",self_default:"اشتراک من",self_suffix:" (من)",visitor:"اشتراک مهمان",expired_tpl:" · منقضی شده ({date})",valid_tpl:" · معتبر تا {date}"
}
};
function getLang(){try{var l=localStorage.getItem("site-lang");if(l==="en"||l==="fa"||l==="zh")return l;}catch(e){}try{var a=[];if(navigator.language)a.push(navigator.language);if(navigator.languages)a=a.concat(navigator.languages);for(var i=0;i<a.length;i++){var x=String(a[i]).toLowerCase();if(x.indexOf("fa")===0)return "fa";if(x.indexOf("en")===0)return "en";if(x.indexOf("zh")===0)return "zh";}}catch(e){}return "en";}
function t(key){var l=getLang();var d=I18N[l]||I18N.zh;return d[key]!==undefined?d[key]:(I18N.zh[key]!==undefined?I18N.zh[key]:key);}
function applyI18n(){
var l=getLang();
document.documentElement.lang=l==="zh"?"zh-CN":l;
document.documentElement.dir=l==="fa"?"rtl":"ltr";
document.querySelectorAll("[data-i18n]").forEach(function(el){var k=el.getAttribute("data-i18n");el.textContent=t(k);});
document.querySelectorAll("[data-i18n-ph]").forEach(function(el){var k=el.getAttribute("data-i18n-ph");el.setAttribute("placeholder",t(k));});
document.querySelectorAll("[data-i18n-aria]").forEach(function(el){var k=el.getAttribute("data-i18n-aria");el.setAttribute("aria-label",t(k));});
}
function syncLangSelects(){var l=getLang();document.querySelectorAll(".lang-select").forEach(function(s){s.value=l;});}
function wireLangSelects(){document.querySelectorAll(".lang-select").forEach(function(s){s.addEventListener("change",function(){setLang(s.value);});});}
function setLang(l){
try{localStorage.setItem("site-lang",l);}catch(e){}
applyI18n();
syncLangSelects();
if(typeof window.__onLangChange==="function"){try{window.__onLangChange(l);}catch(e){}}
}
window.__i18n={getLang:getLang,setLang:setLang,t:t,applyI18n:applyI18n};
window.t=t;
document.addEventListener("DOMContentLoaded",function(){
applyI18n();
wireLangSelects();
syncLangSelects();
});
})();
