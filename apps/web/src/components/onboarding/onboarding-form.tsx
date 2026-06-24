'use client'

import { useState, type FormEvent } from 'react'
import { useOrganizationList } from '@clerk/nextjs'
import { Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { unwrap } from '@/lib/query/leads'
import { completeOnboarding } from '@/app/onboarding/actions'

export function OnboardingForm() {
  const { isLoaded, createOrganization, setActive } = useOrganizationList()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (name.trim().length < 2) {
      toast.error('Please enter your organization name.')
      return
    }
    setBusy(true)
    try {
      if (!isLoaded || !createOrganization || !setActive) {
        throw new Error('Still loading — please try again in a moment.')
      }
      // 1) Create the Clerk org. 2) Persist details to OUR tenant using that org id
      // directly (no dependency on active-org propagation). 3) Activate it. 4) Hard
      // navigate so the dashboard loads with the org already active in the session.
      const org = await createOrganization({ name: name.trim() })
      unwrap(
        await completeOnboarding({
          orgId: org.id,
          name: name.trim(),
          city: city.trim(),
          state: state.trim(),
        }),
      )
      await setActive({ organization: org.id })
      toast.success('Workspace ready!')
      window.location.assign('/dashboard')
    } catch (err) {
      toast.error((err as Error).message || 'Could not finish setup.')
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl">Set up your workspace</CardTitle>
          <CardDescription>
            Tell us about your organization. You can refine everything later in Settings.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Exports"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="org-city">City</Label>
              <Input
                id="org-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Hyderabad"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-state">State</Label>
              <Input
                id="org-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Telangana"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Setting up…
              </>
            ) : (
              'Finish setup'
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You can connect Gmail and invite teammates after setup.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
