import { useLocation, useNavigate, Route, Routes } from 'react-router-dom';
import { Box, PageTitle, Tabs } from '../components/ui';
import { SubjectPicker, useLocalState } from '../components/SubjectPicker';
import Papers from './pyqs/Papers';
import Bank from './pyqs/Bank';
import Analysis from './pyqs/Analysis';
import Numerical from './pyqs/Numerical';
import Similar from './pyqs/Similar';
import Generator from './pyqs/Generator';

const TABS = [
  { id: 'papers', label: 'upload & papers' },
  { id: 'bank', label: 'question bank' },
  { id: 'analysis', label: 'paper analysis' },
  { id: 'numerical', label: 'numerical changer' },
  { id: 'similar', label: 'similar questions' },
  { id: 'generate', label: 'practice papers' },
] as const;
type T = (typeof TABS)[number]['id'];

export default function Pyqs() {
  const loc = useLocation();
  const nav = useNavigate();
  const tab = (loc.pathname.split('/')[2] || 'papers') as T;
  const [subjectId, setSubjectId] = useLocalState('pyq-subject', '');
  return (
    <div className="space-y-6">
      <Box className="pt-4">
        <PageTitle sub="previous year papers, question bank & practice paper generator">PYQs &amp; Papers</PageTitle>
        <SubjectPicker value={subjectId} onChange={setSubjectId} />
        <Tabs tabs={TABS as unknown as { id: T; label: string }[]} value={tab} onChange={(t) => nav('/pyqs/' + t)} />
      </Box>
      {subjectId && (
        <Routes>
          <Route path="bank" element={<Bank subjectId={subjectId} />} />
          <Route path="analysis" element={<Analysis subjectId={subjectId} />} />
          <Route path="numerical" element={<Numerical subjectId={subjectId} />} />
          <Route path="similar" element={<Similar subjectId={subjectId} />} />
          <Route path="generate" element={<Generator subjectId={subjectId} />} />
          <Route path="*" element={<Papers subjectId={subjectId} />} />
        </Routes>
      )}
    </div>
  );
}
