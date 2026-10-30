import './canvas.css';
import './proposed.css';
import {
  AppShell,
  AppShellHeader,
  Button,
  PageContainer,
  SidebarTrigger,
  TooltipProvider,
  WorkspaceHeaderTitle,
  WorkspaceSidebar,
  type WorkspaceSidebarSection,
} from '@acme/ui';
import {
  Bell,
  BookOpen,
  CaretLeft,
  CaretRight,
    Moon,
    Sun,
  Tray,
} from '@phosphor-icons/react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import { person } from './data';
import { type Canvas, CanvasContext, type Detail, DetailSheet, Pick, type Screen } from './kit';
// Um arquivo por grupo de telas; cada implementador edita só o seu.
import { screens as exampleScreens } from './screens/example';

const screens: Screen[] = [...exampleScreens];
// Enumeração para o script de captura.
(window as unknown as { __canvasScreens: unknown }).__canvasScreens = screens.map((s) => ({ id: s.id, states: Object.keys(s.states ?? {}) }));

/** Navegação do app real: troque pelos destinos e grupos da área redesenhada. */
const NAV: Record<string, { label: string; icon: ReactNode; to: string; header: string }> = {
  itens: { label: 'Itens', icon: <Tray size={17} />, to: 'X1', header: 'Itens' },
  ajuda: { label: 'Guias', icon: <BookOpen size={17} />, to: 'X1', header: 'Guias' },
};

const SECTIONS: { id: string; label: string; items: string[] }[] = [{ id: 'trabalho', label: 'Trabalho', items: ['itens', 'ajuda'] }];

function AreaSidebar({ current, go }: { current?: string; go: (id: string) => void }) {
  const sections: WorkspaceSidebarSection[] = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items.map((key) => {
      const item = NAV[key];
      return {
        id: key,
        label: item.label,
        icon: item.icon,
        isActive: current === key,
        badge: key === 'itens' ? <span className="font-mono text-[10px] text-muted-foreground">2</span> : undefined,
        link: (
          <a
            href={`#${item.to}`}
            onClick={(event) => {
              event.preventDefault();
              go(item.to);
            }}
          />
        ),
      };
    }),
  }));
  return (
    <WorkspaceSidebar
      ariaLabel="Navegação da plataforma"
      brandLink={<a href="#X1" />}
      className="!h-auto sticky top-0 min-h-[calc(100svh-68px)] self-start"
      footer={
        <a className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground text-xs hover:text-foreground" href="#X1">
          <BookOpen aria-hidden="true" size={15} />
          Guias
        </a>
      }
      identity={{ label: person.name, description: person.role }}
      sections={sections}
      subtitle="Produto · Organização"
    />
  );
}

function AppFrame({ screen, go, children }: { screen: Screen; go: (id: string) => void; children: ReactNode }) {
  const nav = screen.nav ? NAV[screen.nav] : undefined;
  return (
    <AppShell
      className="canvas-shell"
      containerClassName="max-w-[1240px] px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      defaultOpen
      header={
        <AppShellHeader>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <WorkspaceHeaderTitle context="Área" label={nav?.header ?? 'Itens'} />
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label="Notificações, 3 não lidas" className="relative" size="icon" variant="ghost">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
            </Button>
            <Button aria-label="Abrir perfil" size="icon" variant="ghost">
              <span className="grid size-7 place-items-center rounded-full bg-muted font-semibold text-[11px]">HD</span>
            </Button>
          </div>
        </AppShellHeader>
      }
      insetClassName="!overflow-visible"
      sidebar={<AreaSidebar current={screen.nav} go={go} />}
    >
      <PageContainer>
        {children}
        <p className="mt-5 border-border border-t pt-4 text-[10px] text-muted-foreground">
          Proposta para aprovação · dados e textos de exemplo · sem integração com o sistema
        </p>
      </PageContainer>
    </AppShell>
  );
}

/** Entrada sem shell: marca no topo, conteúdo centrado, sem cartão protagonista. */
function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="canvas-auth grid min-h-[calc(100svh-68px)] place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-2.5">
          <img alt="" className="size-8 dark:hidden" src="./logo-symbol.png" />
          <img alt="" className="hidden size-8 dark:block" src="./logo-symbol-light.png" />
          <span className="font-semibold text-sm tracking-tight">Produto</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Cadastro inicial: topo simples, coluna de leitura. */
function OnboardingFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100svh-68px)] bg-background">
      <header className="flex min-h-[52px] items-center justify-between border-border border-b px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <img alt="" className="size-6 dark:hidden" src="./logo-symbol.png" />
          <img alt="" className="hidden size-6 dark:block" src="./logo-symbol-light.png" />
          <WorkspaceHeaderTitle context="Pesquisador" label="Cadastro" />
        </div>
      </header>
      <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-8">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}

function readHash() {
  const [id, state = ''] = location.hash.slice(1).split('~');
  return { id, state };
}

function App() {
  const initial = readHash();
  const [screenId, setScreenId] = useState(screens.some((s) => s.id === initial.id) ? initial.id : 'X1');
  const [state, setState] = useState(initial.state);
  const [dark, setDark] = useState(new URLSearchParams(location.search).get('tema') === 'escuro');
  const [detail, setDetail] = useState<Detail | null>(null);
  const screen = screens.find((s) => s.id === screenId) ?? screens[0];
  const index = screens.indexOf(screen);

  function go(target: string) {
    const [id, nextState = ''] = target.split('~');
    if (!screens.some((s) => s.id === id)) return;
    setDetail(null);
    setScreenId(id);
    setState(nextState);
    location.hash = nextState ? `${id}~${nextState}` : id;
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    const listener = () => {
      const next = readHash();
      if (screens.some((s) => s.id === next.id)) {
        setScreenId(next.id);
        setState(next.state);
      }
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const canvas: Canvas = useMemo(
    () => ({
      go,
      detail: setDetail,
      toast: (message, tone = 'success') => (tone === 'error' ? toast.error(message) : toast.success(message)),
      state,
    }),
    // biome-ignore lint/correctness/useExhaustiveDependencies: go é estável no canvas
    [state],
  );

  const options = screens.map((s) => `${s.id} · ${s.label}`);
  const stateOptions = screen.states ? Object.entries(screen.states) : [];
  const body = <div key={`${screen.id}~${state}`}>{screen.render()}</div>;

  return (
    <CanvasContext.Provider value={canvas}>
      <div className="canvas-toolbar flex flex-wrap items-center justify-between gap-2 border-border border-b bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-xs">Área · canvas de aprovação</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{screens.length} telas · dados fictícios</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-md:basis-full">
          <Button aria-label="Tela anterior" disabled={index === 0} size="icon" variant="outline" onClick={() => go(screens[index - 1].id)}>
            <CaretLeft size={16} />
          </Button>
          <div className="w-72 min-w-0 max-md:flex-1">
            <Pick key={screen.id} label="Tela do canvas" options={options} value={`${screen.id} · ${screen.label}`} onChange={(value) => go(value.split(' · ')[0])} />
          </div>
          {stateOptions.length ? (
            <div className="w-48 min-w-0 max-md:flex-1">
              <Pick
                key={`${screen.id}-state`}
                label="Estado da tela"
                options={['Padrão', ...stateOptions.map(([, label]) => label)]}
                value={stateOptions.find(([key]) => key === state)?.[1] ?? 'Padrão'}
                onChange={(value) => go(value === 'Padrão' ? screen.id : `${screen.id}~${stateOptions.find(([, label]) => label === value)?.[0]}`)}
              />
            </div>
          ) : null}
          <Button aria-label="Próxima tela" disabled={index === screens.length - 1} size="icon" variant="outline" onClick={() => go(screens[index + 1].id)}>
            <CaretRight size={16} />
          </Button>
          <Button aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} size="icon" variant="outline" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </Button>
        </div>
      </div>
      {screen.shell === 'app' ? (
        <AppFrame go={go} screen={screen}>
          {body}
        </AppFrame>
      ) : screen.shell === 'auth' ? (
        <AuthFrame>{body}</AuthFrame>
      ) : (
        <OnboardingFrame>{body}</OnboardingFrame>
      )}
      <DetailSheet close={() => setDetail(null)} detail={detail} />
      <Toaster closeButton position="bottom-right" richColors theme={dark ? 'dark' : 'light'} />
    </CanvasContext.Provider>
  );
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <TooltipProvider>
      <App />
    </TooltipProvider>,
  );
