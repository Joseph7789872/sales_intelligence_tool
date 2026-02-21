import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useUpdateProfile } from '@/hooks/useUser';

interface WelcomeStepProps {
  onComplete: () => void;
  initialCompanyName?: string;
}

export function WelcomeStep({ onComplete, initialCompanyName = '' }: WelcomeStepProps) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const updateProfile = useUpdateProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    await updateProfile.mutateAsync({ companyName: companyName.trim() });
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="lg" className="text-center">
        <div className="mx-auto max-w-md">
          <div className="mb-2 text-4xl">&#128640;</div>
          <h2 className="text-2xl font-bold text-text-primary">
            Welcome to ICP Playbook Engine
          </h2>
          <p className="mt-2 text-text-secondary">
            Let&apos;s set up your account in a few quick steps. We&apos;ll analyze your
            closed-won deals and build repeatable sales playbooks.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 text-left">
            <Input
              label="What's your company name?"
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
            />

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                isLoading={updateProfile.isPending}
                disabled={!companyName.trim()}
              >
                Continue
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </motion.div>
  );
}
