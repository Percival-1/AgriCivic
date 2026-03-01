/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

declare module 'vuetify/styles' {
    const styles: string;
    export default styles;
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
