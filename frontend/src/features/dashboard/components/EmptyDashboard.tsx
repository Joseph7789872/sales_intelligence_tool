import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function EmptyDashboard() {
  const navigate = useNavigate();

  return (
    <Card padding="lg" className="mx-auto max-w-md text-center">
      <div className="text-4xl">📊</div>
      <h2 className="mt-4 text-xl font-semibold text-text-primary">
        No analyses yet
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        Select your closed-won deals to generate AI-powered sales playbooks
        with personalized cold emails, discovery questions, and objection
        handling.
      </p>
      <Button
        className="mt-6"
        onClick={() => navigate('/deals')}
      >
        Go to Deals
      </Button>
    </Card>
  );
}
