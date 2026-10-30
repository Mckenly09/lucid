import type { SubjectId } from './config';

/** Electives are grouped by cluster in Settings → My electives; core courses have none. */
export type Cluster = 'stem' | 'humss' | 'business';

export type Course = { id: string; name: string; subject: SubjectId; cluster?: Cluster };

export const CLUSTER_NAME: Record<Cluster, string> = {
  stem: 'STEM',
  humss: 'Arts, Social Sciences & Humanities',
  business: 'Business & Entrepreneurship',
};

// Senior high courses (docs/subjects.md "Courses"). Each sits under the subject whose prompt fits it best; the course
// name goes into the system prompt so the model knows the class. Ids are stored in chats.course: never rename one.
export const COURSES: Course[] = [
  { id: 'oral-comm', name: 'Oral Communication', subject: 'english' },
  { id: 'reading-writing', name: 'Reading and Writing', subject: 'english' },
  { id: '21st-lit', name: '21st Century Literature from the Philippines and the World', subject: 'english' },
  { id: 'mil', name: 'Media and Information Literacy', subject: 'english' },
  { id: 'creative-writing', name: 'Creative Writing', subject: 'english', cluster: 'humss' },

  { id: 'komunikasyon', name: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', subject: 'filipino' },
  { id: 'pagbasa', name: 'Pagbasa at Pagsusuri ng Iba’t Ibang Teksto Tungo sa Pananaliksik', subject: 'filipino' },
  { id: 'filipino-1', name: 'Filipino 1', subject: 'filipino', cluster: 'humss' },

  { id: 'gen-math', name: 'General Mathematics', subject: 'math' },
  { id: 'stat-prob', name: 'Statistics and Probability', subject: 'math' },
  { id: 'finite-math', name: 'Finite Mathematics', subject: 'math', cluster: 'stem' },
  { id: 'business-finance', name: 'Business Finance', subject: 'math', cluster: 'business' },
  { id: 'accounting', name: 'Basic Accounting & Income Taxation', subject: 'math', cluster: 'business' },

  { id: 'earth-life', name: 'Earth and Life Science', subject: 'science' },
  { id: 'physical-science', name: 'Physical Science', subject: 'science' },
  { id: 'pe-health', name: 'Physical Education and Health', subject: 'science' },
  { id: 'bio-1', name: 'Biology 1', subject: 'science', cluster: 'stem' },
  { id: 'bio-2', name: 'Biology 2', subject: 'science', cluster: 'stem' },
  { id: 'chem-1', name: 'Chemistry 1', subject: 'science', cluster: 'stem' },
  { id: 'chem-2', name: 'Chemistry 2', subject: 'science', cluster: 'stem' },
  { id: 'physics-1', name: 'Physics 1', subject: 'science', cluster: 'stem' },
  { id: 'physics-2', name: 'Physics 2', subject: 'science', cluster: 'stem' },
  { id: 'earth-space-1', name: 'Earth & Space Science 1', subject: 'science', cluster: 'stem' },
  { id: 'earth-space-2', name: 'Earth & Space Science 2', subject: 'science', cluster: 'stem' },

  { id: 'ucsp', name: 'Understanding Culture, Society, and Politics', subject: 'social' },
  { id: 'philo-human', name: 'Introduction to the Philosophy of the Human Person', subject: 'social' },
  { id: 'per-dev', name: 'Personal Development', subject: 'social' },
  { id: 'cpar', name: 'Contemporary Philippine Arts from the Regions', subject: 'social' },
  { id: 'civic', name: 'Civic Engagement', subject: 'social', cluster: 'humss' },
  { id: 'arts-leadership', name: 'Leadership & Management in the Arts', subject: 'social', cluster: 'humss' },
  { id: 'creative-industries', name: 'Creative Industries', subject: 'social', cluster: 'humss' },
  { id: 'intro-philo', name: 'Introduction to Philosophy', subject: 'social', cluster: 'humss' },
  { id: 'world-religions', name: 'World Religions', subject: 'social', cluster: 'humss' },
  { id: 'entrepreneurship', name: 'Introduction to Entrepreneurship', subject: 'social', cluster: 'business' },
  { id: 'org-management', name: 'Organization & Management', subject: 'social', cluster: 'business' },
];

export const course = (id: string | null | undefined) => COURSES.find((c) => c.id === id);

/** A subject's core courses plus the electives the student picked, in list order. */
export const coursesFor = (subject: SubjectId, electives: string[]) =>
  COURSES.filter((c) => c.subject === subject && (!c.cluster || electives.includes(c.id)));
