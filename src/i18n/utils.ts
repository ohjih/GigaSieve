import { ui, defaultLang, languages } from './ui';

export { ui, defaultLang, languages };

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split('/');
    if (lang && lang in ui) return lang as keyof typeof ui;
    return defaultLang as keyof typeof ui;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui[typeof defaultLang]) {
        return ui[lang][key] || ui[defaultLang][key];
    };
}

export function buildLangPath(path: string, lang: string) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const withSlash = cleanPath === '/' ? '/' : `${cleanPath.replace(/\/+$/, '')}/`;
    if (lang === defaultLang) return withSlash;
    return `/${lang}${withSlash === '/' ? '/' : withSlash}`;
}
