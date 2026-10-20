// Primitivas do canvas na receita do design system vigente. Toda tela usa só estas peças
// e os componentes reais de @acme/ui; nenhuma variante nova de packages/ui.
import {
  Button,
  Input,
  OperationalFilterButton,
  OperationalFilterGroup,
  OperationalListSurface,
  OperationalTable,
  OperationalTableBody,
  OperationalTableCell,
  OperationalTableHead,
  OperationalTableHeader,
  OperationalTableHeaderRow,
  OperationalTableRow,
  PageBody,
  PageHeader,
  PageHeading,
  ProjectFlowField,
  ProjectFlowGroup,
  ProjectFlowSection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  type StatusBadgeTone,
  Textarea,
} from '@acme/ui';
import { ArrowLeft, ArrowRight, type Icon, MagnifyingGlass } from '@phosphor-icons/react';
import { createContext, type ReactNode, useContext, useId } from 'react';

/* ------------------------------------------------------------------ */
/* Contexto do canvas: navegação entre telas, detalhes em Sheet, toast */
/* ------------------------------------------------------------------ */

export type Detail = {
  title: string;
  subtitle?: string;
  fields: [string, ReactNode][];
  footer?: ReactNode;
};

export type Canvas = {
  /** Abre outra tela do canvas pelo id (ex.: 'P4'). */
  go: (id: string) => void;
  /** Abre um Sheet de detalhes à direita. */
  detail: (detail: Detail) => void;
  /** Feedback transitório (sonner). */
  toast: (message: string, tone?: 'success' | 'error') => void;
  /** Estado opcional por tela, vindo de `?estado=` ou dos botões do índice. */
  state: string;
};

export const CanvasContext = createContext<Canvas | null>(null);
export function useCanvas(): Canvas {
  const value = useContext(CanvasContext);
  if (!value) throw new Error('useCanvas fora do CanvasContext');
  return value;
}

/* ------------------------------------------------------------------ */
/* Registro de telas                                                    */
/* ------------------------------------------------------------------ */

export type ScreenShell = 'app' | 'auth' | 'onboarding';

export type Screen = {
  /** Id curto e estável, usado no hash (#P4) e nas capturas. */
  id: string;
  /** Rótulo no índice do canvas. */
  label: string;
  /** Item da sidebar destacado nesta tela (id de NAV em main.tsx). */
  nav?: string;
  shell: ScreenShell;
  /** Estados adicionais demonstráveis: id → rótulo. */
  states?: Record<string, string>;
  render: () => ReactNode;
};

/* ------------------------------------------------------------------ */
/* Anatomia da página                                                   */
/* ------------------------------------------------------------------ */

/**
 * Página essential: voltar opcional acima do título, kicker curto, título,
 * uma frase de descrição e ações à direita. Nada de faixas ou cartões no topo.
 */
export function Page({
  back,
  kicker,
  title,
  description,
  actions,
  meta,
  children,
}: {
  back?: { label: string; to: string };
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Linha discreta de metadados sob o título (texto, sem caixas). */
  meta?: ReactNode;
  children: ReactNode;
}) {
  const { go } = useCanvas();
  return (
    <>
      <PageHeader>
        {back ? (
          <Button className="-ml-2 mb-2 h-7 w-fit self-start px-2 text-muted-foreground" size="sm" variant="ghost" onClick={() => go(back.to)}>
            <ArrowLeft aria-hidden="true" size={14} />
            {back.label}
          </Button>
        ) : null}
        <PageHeading actions={actions} description={description} kicker={kicker} title={title} />
        {meta ? <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-muted-foreground text-xs leading-5">{meta}</div> : null}
      </PageHeader>
      <PageBody>{children}</PageBody>
    </>
  );
}

/** Pilha de seções com o espaçamento padrão. */
export function Stack({ children }: { children: ReactNode }) {
  return <ProjectFlowSection>{children}</ProjectFlowSection>;
}

/** Seção essential: ícone, título com contagem, descrição curta, ações no cabeçalho. */
export function Section({
  title,
  count,
  icon,
  description,
  actions,
  children,
}: {
  title: string;
  count?: number;
  icon: Icon;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ProjectFlowGroup
      actions={actions}
      description={description}
      headingLevel={2}
      icon={icon}
      title={count === undefined ? title : `${title} · ${count}`}
    >
      {children}
    </ProjectFlowGroup>
  );
}

/** Estado vazio: uma frase e, se houver, o próximo passo. Sem moldura. */
export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[var(--radius-lg)] bg-muted/20 px-4 py-8 text-center text-muted-foreground text-sm">
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Situação                                                            */
/* ------------------------------------------------------------------ */

/** Selo de situação: sempre com texto; ícone opcional. Nunca só cor. */
export function Status({ text, tone = 'info', icon: I }: { text: string; tone?: StatusBadgeTone; icon?: Icon }) {
  return (
    <StatusBadge className="w-fit" showDot={false} size="sm" tone={tone}>
      {I ? <I aria-hidden="true" size={12} /> : null}
      {text}
    </StatusBadge>
  );
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

/** Ação de linha: ícone + rótulo; no celular só ícone, com rótulo acessível. */
export function RowAction({
  label,
  icon: I = ArrowRight,
  onClick,
  primary = false,
  disabled = false,
}: {
  label: string;
  icon?: Icon;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      className="max-md:size-8 max-md:p-0"
      disabled={disabled}
      size="sm"
      variant={primary ? 'default' : 'outline'}
      onClick={onClick}
    >
      <I aria-hidden="true" size={15} />
      <span className="max-md:sr-only">{label}</span>
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela única (mesma em todas as larguras)                           */
/* ------------------------------------------------------------------ */

export type Column = {
  label: string;
  /** Largura no desktop, ex.: 'w-[18%]'. */
  width?: string;
  align?: 'right';
};

export type Row = {
  key: string;
  /** Primeira coluna: título (e link), linha secundária e meta só no celular. */
  title: ReactNode;
  secondary?: ReactNode;
  /** Conteúdo repetido sob o título abaixo de md (as colunas somem). */
  mobileMeta?: ReactNode;
  leading?: ReactNode;
  onOpen?: () => void;
  /** Demais colunas, na ordem de `columns.slice(1)`; somem abaixo de md. */
  cells?: ReactNode[];
  actions?: ReactNode;
};

/**
 * A lista essential: uma única moldura (a tabela), sem cartões nem grupos
 * aninhados. Colunas secundárias somem no celular e reaparecem sob o título.
 */
export function List({
  label,
  columns,
  rows,
  actionsWidth = 'w-[6.5rem] md:w-[22%]',
}: {
  label: string;
  columns: Column[];
  rows: Row[];
  actionsWidth?: string;
}) {
  const hasActions = rows.some((row) => row.actions);
  return (
    <OperationalListSurface>
      <OperationalTable className="essential-table w-full min-w-0 table-fixed" viewportAriaLabel={label}>
        <OperationalTableHeader>
          <OperationalTableHeaderRow>
            {columns.map((column, index) => (
              <OperationalTableHead
                className={`${index > 0 ? 'hidden md:table-cell' : ''} ${column.width ?? ''} ${column.align === 'right' ? 'text-right' : ''}`}
                key={column.label}
              >
                {column.label}
              </OperationalTableHead>
            ))}
            {hasActions ? (
              <OperationalTableHead className={`${actionsWidth} pr-4 text-right`}>
                <span className="sr-only md:not-sr-only">Ações</span>
              </OperationalTableHead>
            ) : null}
          </OperationalTableHeaderRow>
        </OperationalTableHeader>
        <OperationalTableBody>
          {rows.map((row) => (
            <OperationalTableRow key={row.key}>
              <OperationalTableCell className="py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {row.leading}
                  <div className="min-w-0">
                    {row.onOpen ? (
                      <button
                        className="line-clamp-2 block max-w-full text-left font-medium text-[13px] text-foreground underline-offset-4 hover:underline focus-visible:underline"
                        type="button"
                        onClick={row.onOpen}
                      >
                        {row.title}
                      </button>
                    ) : (
                      <p className="line-clamp-2 font-medium text-[13px]">{row.title}</p>
                    )}
                    {row.secondary ? <p className="mt-0.5 truncate text-muted-foreground text-xs">{row.secondary}</p> : null}
                    {row.mobileMeta ? <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs md:hidden">{row.mobileMeta}</div> : null}
                  </div>
                </div>
              </OperationalTableCell>
              {(row.cells ?? []).map((cell, index) => (
                <OperationalTableCell
                  className={`hidden text-[13px] md:table-cell ${columns[index + 1]?.align === 'right' ? 'text-right' : ''}`}
                  // biome-ignore lint/suspicious/noArrayIndexKey: colunas fixas
                  key={index}
                >
                  {cell}
                </OperationalTableCell>
              ))}
              {hasActions ? (
                <OperationalTableCell className="pr-4 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">{row.actions}</div>
                </OperationalTableCell>
              ) : null}
            </OperationalTableRow>
          ))}
        </OperationalTableBody>
      </OperationalTable>
    </OperationalListSurface>
  );
}

/* ------------------------------------------------------------------ */
/* Filtros e busca                                                     */
/* ------------------------------------------------------------------ */

/** Barra de filtros sem moldura: busca + filtros segmentados. */
export function Toolbar({
  search,
  filters,
  active,
  onFilter,
  trailing,
}: {
  search?: string;
  filters?: { id: string; label: string; count?: number }[];
  active?: string;
  onFilter?: (id: string) => void;
  trailing?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search ? (
        <div className="relative min-w-0 flex-1 basis-60">
          <MagnifyingGlass aria-hidden="true" className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground" size={15} />
          <label className="sr-only" htmlFor={id}>
            {search}
          </label>
          <Input className="pl-9" id={id} placeholder={search} />
        </div>
      ) : null}
      {filters ? (
        <OperationalFilterGroup aria-label="Filtrar">
          {filters.map((filter) => (
            <OperationalFilterButton
              active={filter.id === active}
              count={filter.count}
              key={filter.id}
              onClick={() => onFilter?.(filter.id)}
            >
              {filter.label}
            </OperationalFilterButton>
          ))}
        </OperationalFilterGroup>
      ) : null}
      {trailing}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulários                                                         */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  value,
  placeholder,
  help,
  required,
  optional,
  multiline = false,
  children,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <ProjectFlowField help={help} htmlFor={id} label={label} optional={optional} required={required}>
      {children ??
        (multiline ? (
          <Textarea defaultValue={value} id={id} placeholder={placeholder} rows={4} />
        ) : (
          <Input defaultValue={value} id={id} placeholder={placeholder} />
        ))}
    </ProjectFlowField>
  );
}

export function Pick({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select defaultValue={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue placeholder={placeholder ?? 'Selecione'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Lista de definição plana (resumos, detalhes). Sem caixas. */
export function Facts({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 | 3 }) {
  const grid = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';
  return (
    <dl className={`grid gap-x-8 gap-y-4 ${grid}`}>
      {items.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="mt-1 break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Texto técnico (protocolo, código, hash): JetBrains Mono, discreto. */
export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] text-muted-foreground tracking-tight">{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Sheet de detalhes                                                   */
/* ------------------------------------------------------------------ */

export function DetailSheet({ detail, close }: { detail: Detail | null; close: () => void }) {
  return (
    <Sheet open={detail !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{detail?.title}</SheetTitle>
          {detail?.subtitle ? <SheetDescription>{detail.subtitle}</SheetDescription> : null}
        </SheetHeader>
        <dl className="divide-y divide-border/50 px-4">
          {detail?.fields.map(([label, value]) => (
            <div className="py-3.5" key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 break-words text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        {detail?.footer ? <div className="flex flex-wrap justify-end gap-2 border-border/50 border-t px-4 pt-4">{detail.footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
