import { useLang } from './i18n.jsx';

export function usePageT(dict) {
  const { lang, locale, t: tg } = useLang();
  const t = (key, vars) => {
    let s = dict[lang] && dict[lang][key];
    if (s === undefined) s = dict.lo && dict.lo[key];
    if (s === undefined) return tg(key, vars);
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.split(`{${k}}`).join(vars[k]);
      });
    }
    return s;
  };
  return { t, lang, locale };
}