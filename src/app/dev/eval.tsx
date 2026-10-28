import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Header } from '@/components/header';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { modelFile, toPath } from '@/features/models/services/files';
import { useModels } from '@/features/models/store';
import { load } from '@/llm/engine';
import { modelById } from '@/llm/models';
import { subject, type SubjectId } from '@/llm/subjects/config';
import { EVAL_SETS } from '@/llm/subjects/eval/grade';
import { type EvalResult, passRate, runEval, speed } from '@/llm/subjects/eval/run';

/** Outside the component: the React Compiler lint treats Date.now() in a component body as render-time. */
async function msToRun(work: () => Promise<void>) {
  const start = Date.now();
  await work();
  return Date.now() - start;
}

/** Dev-only: run the subject eval sets on the phone. Open with `adb shell am start -d lucid://dev/eval`. */
export default function Eval() {
  const installedId = useModels((s) => s.installedId);
  const [running, setRunning] = useState<SubjectId | null>(null);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<Partial<Record<SubjectId, EvalResult[]>>>({});
  const [error, setError] = useState<string | null>(null);
  /** How long the model took to load (0 when it was already loaded). */
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const run = useRef<ReturnType<typeof runEval> | null>(null);

  useEffect(() => () => run.current?.stop(), []);

  if (!__DEV__) return <Redirect href="/" />;

  const start = async (id: SubjectId) => {
    if (!installedId) return setError('Download a model first.');
    setError(null);
    setRunning(id);
    setResults((r) => ({ ...r, [id]: [] }));
    try {
      setProgress('Loading model…');
      setLoadMs(await msToRun(() => load(toPath(modelFile(modelById(installedId)).uri))));
      run.current = runEval(id, (r, done, total) => {
        setProgress(`${done}/${total}`);
        setResults((all) => ({ ...all, [id]: [...(all[id] ?? []), r] }));
      });
      await run.current.done;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      run.current = null;
      setRunning(null);
      setProgress('');
    }
  };

  const subjects = Object.keys(EVAL_SETS) as SubjectId[];
  const failures = subjects.flatMap((id) => (results[id] ?? []).filter((r) => !r.pass).map((r) => ({ id, r })));

  return (
    <Screen padded={false}>
      <Header title={`Eval · ${installedId ? modelById(installedId).name : 'no model'}`} bordered />
      <FlatList
        data={failures}
        keyExtractor={(f) => `${f.id}-${f.r.q}`}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={
          <View className="gap-3">
            {error && (
              <Banner status="danger" message={error} icon={<Icon name="TriangleAlert" size={22} tone="danger" />} />
            )}
            {loadMs !== null && (
              <Text variant="small" tone="muted">
                Model load: {(loadMs / 1000).toFixed(1)} s
              </Text>
            )}
            {subjects.map((id) => {
              const r = results[id] ?? [];
              const s = speed(r);
              return (
                <View key={id} className="flex-row items-center gap-3">
                  <Text className="flex-1">
                    {subject(id).short}: {r.length ? `${passRate(r)}% (${r.filter((x) => x.pass).length}/${r.length})` : '—'}
                    {running === id && progress ? ` · ${progress}` : ''}
                    {s ? ` · 1st token ${(s.firstTokenMs / 1000).toFixed(1)} s · ${s.tokensPerSec} tok/s` : ''}
                  </Text>
                  {running === id ? (
                    <Button label="Stop" variant="secondary" size="sm" onPress={() => run.current?.stop()} />
                  ) : (
                    <Button
                      label={`Run ${EVAL_SETS[id]!.length}`}
                      size="sm"
                      disabled={running !== null}
                      onPress={() => void start(id)}
                    />
                  )}
                </View>
              );
            })}
            {failures.length > 0 && <Text variant="label">Failed</Text>}
          </View>
        }
        renderItem={({ item: { id, r } }) => (
          <View className="gap-1 rounded-md border border-ink/10 p-3">
            <Text variant="small" className="font-semibold">
              {subject(id).short} · {r.q}
            </Text>
            <Text variant="caption" tone="danger" className="font-sans">
              Missing: {r.missing.join(', ') || '—'}
              {r.forbidden.length ? ` · Forbidden: ${r.forbidden.join(', ')}` : ''}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={6}>
              {r.answer}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}
