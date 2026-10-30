// Tela de referência: o orquestrador escreve esta antes de delegar. Os implementadores copiam o padrão.
import { Button } from '@acme/ui';
import { FolderSimple, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { items, situationTone } from '../data';
import { Empty, List, Mono, Page, type Screen, Section, Stack, Status, Toolbar, useCanvas } from '../kit';

function ExampleList() {
  const { state, toast, detail } = useCanvas();
  const [filter, setFilter] = useState('todos');
  const all = state === 'vazio' ? [] : items;
  const visible = all.filter((i) => filter === 'todos' || i.situation === filter);
  return (
    <Page
      actions={
        <Button onClick={() => toast('Ação de exemplo.')}>
          <Plus aria-hidden="true" size={15} />
          Novo item
        </Button>
      }
      description="Uma frase dizendo para que serve a tela."
      title="Itens"
    >
      <Stack>
        <Toolbar
          active={filter}
          filters={[{ id: 'todos', label: 'Todos', count: all.length }, ...(['Em análise', 'Rascunho', 'Aprovado'] as const).map((s) => ({ id: s, label: s, count: all.filter((i) => i.situation === s).length }))]}
          search="Buscar por título ou código"
          onFilter={setFilter}
        />
        <Section count={visible.length} icon={FolderSimple} title="Meus itens">
          {visible.length === 0 ? (
            <Empty text={all.length ? 'Nenhum item neste filtro.' : 'Você ainda não tem itens.'} />
          ) : (
            <List
              columns={[{ label: 'Item' }, { label: 'Situação', width: 'w-[16%]' }, { label: 'Próximo passo', width: 'w-[30%]' }, { label: 'Atualizado', width: 'w-[12%]' }]}
              label="Meus itens"
              rows={visible.map((i) => ({
                key: i.id,
                title: i.title,
                secondary: <Mono>{i.code}</Mono>,
                onOpen: () => detail({ title: i.title, subtitle: i.code, fields: [['Situação', i.situation], ['Próximo passo', i.next], ['Atualizado', i.updated]] }),
                mobileMeta: (
                  <>
                    <Status text={i.situation} tone={situationTone[i.situation]} />
                    <span>{i.updated}</span>
                  </>
                ),
                cells: [<Status key="s" text={i.situation} tone={situationTone[i.situation]} />, <span className="text-muted-foreground" key="n">{i.next}</span>, <span className="text-muted-foreground" key="u">{i.updated}</span>],
              }))}
            />
          )}
        </Section>
      </Stack>
    </Page>
  );
}

export const screens: Screen[] = [{ id: 'X1', label: 'Itens', nav: 'itens', shell: 'app', states: { vazio: 'Sem itens' }, render: () => <ExampleList /> }];
