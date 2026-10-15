// Applies the saved light/dark choice before the first paint, so a visitor who picked a theme
// never sees a flash of the other one. Must use the same storage key as
// THEME_STORAGE_KEY in @nearcommerce/helpers (a test keeps them in sync).
const KEY = "nearcommerce-theme";

module.exports = function themeInit() {
  return {
    name: "nearcommerce-theme-init",
    transformIndexHtml() {
      return [
        {
          tag: "script",
          injectTo: "head-prepend",
          children: `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
        },
      ];
    },
  };
};
module.exports.THEME_KEY = KEY;
