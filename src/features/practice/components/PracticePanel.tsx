import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { EmptyState } from '@/components/empty-state';
import { SubjectPicker } from '@/components/subject-picker';
import { Text } from '@/components/text';
import { packTopics } from '@/features/knowledge/pack-files';
import { usePacks } from '@/features/knowledge/store';
import { subject, SUBJECTS, type SubjectId } from '@/llm/subjects/config';

import { useTopicStats } from '../hooks/useTopicStats';
import { usePractice } from '../store';
import { practiceTopics } from '../topics';
import { TopicRow } from './TopicRow';

/** Cards → Practice (design v2-05): subject and grade chips from the installed packs, then the topics to practice. */
export function PracticePanel() {
  const installed = usePacks((s) => s.installed);
  const topics = useMemo(() => practiceTopics(Object.values(installed), packTopics), [installed]);
  const subjects = SUBJECTS.filter((s) => topics.some((t) => t.subject === s.id));
  const [chosenSubject, setSubject] = useState<SubjectId | null>(null);
  const subj = chosenSubject && subjects.some((s) => s.id === chosenSubject) ? chosenSubject : subjects[0]?.id;
  const grades = [...new Set(topics.filter((t) => t.subject === subj).map((t) => t.grade))];
  const [chosenGrade, setGrade] = useState<number | null>(null);
  const grade = chosenGrade != null && grades.includes(chosenGrade) ? chosenGrade : grades[0];
  const shown = topics.filter((t) => t.subject === subj && t.grade === grade);

  const stats = useTopicStats(subj, grade);

  if (!topics.length) {
    return (
      <View className="flex-1 px-4">
        <EmptyState
          icon={
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-lg border border-ink/10 bg-ink/5">
              <Icon name="BookOpen" size={28} />
            </View>
          }
          title="No subject packs yet"
          message="Practice questions are made from subject packs. Download one to start, it works offline after."
          action={
            <Button
              label="Download a subject pack"
              variant="secondary"
              onPress={() => router.navigate('/library')}
              className="mt-4"
            />
          }
        />
      </View>
    );
  }

  return (
    <FlatList
      data={shown}
      keyExtractor={(t) => `${t.grade}-${t.code}`}
      contentContainerClassName="px-4 pb-6"
      renderItem={({ item }) => (
        <TopicRow
          name={item.name}
          stats={stats[item.code]}
          onPress={() => {
            usePractice.getState().start(item);
            router.push('/practice/session');
          }}
        />
      )}
      ListHeaderComponent={
        <View>
          <Text tone="muted" className="mt-4">
            Pick a topic. Lucid makes questions from your subject packs.
          </Text>
          <View className="mt-4 gap-3">
            <SubjectPicker
              value={subj ?? ''}
              onChange={(id) => setSubject(id as SubjectId)}
              options={subjects.map((s) => ({ id: s.id, label: s.short }))}
            />
            {grades.length > 0 && (
              <SubjectPicker
                value={String(grade)}
                onChange={(g) => setGrade(Number(g))}
                options={grades.map((g) => ({ id: String(g), label: `G${g}` }))}
              />
            )}
          </View>
          {subj && grade != null && (
            <Text variant="label" className="mb-1 mt-6">
              Grade {grade} {subject(subj).short} topics
            </Text>
          )}
        </View>
      }
    />
  );
}
