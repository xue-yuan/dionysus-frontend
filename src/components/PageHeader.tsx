import type { Component, JSX } from 'solid-js';

interface PageHeaderProps {
    subtitle?: string;
    titleMain: string;
    titleItalic: string;
    description: string | JSX.Element;
    children?: JSX.Element;
}

export const PageHeader: Component<PageHeaderProps> = (props) => {
    return (
        <header class="flex flex-col md:flex-row items-end justify-between gap-8 mb-8 relative">
            <div class="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

            <div class="space-y-6 relative z-10">
                <div class="flex items-center gap-4 text-primary font-black tracking-[0.5em] text-[10px] uppercase opacity-40">
                    <span>{props.subtitle || "System Archive"}</span>
                    <div class="h-px w-10 bg-current"></div>
                </div>
                <h1 class="text-4xl lg:text-6xl font-black tracking-tightest leading-none">
                    {props.titleMain}<br /><span class="text-primary italic">{props.titleItalic}</span>
                </h1>
                <div class="text-[12px] font-black uppercase text-white/20">
                    {props.description}
                </div>
            </div>

            <div class="relative z-10">
                {props.children}
            </div>

            <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        </header>
    );
};
