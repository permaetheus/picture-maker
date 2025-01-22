# Portrait Generation Worker System
**Development Specification**  
*Version: 1.0*  
*Last Updated: January 20, 2025*

## Existing Infrastructure

### Supabase Database Tables
All database tables are already set up in Supabase with the following schema:

**workers**
```sql
CREATE TABLE workers (
    id bigint PRIMARY KEY,
    email varchar,
    name varchar,
    active boolean,
    last_active timestamptz,
    created_at timestamptz,
    clerk_id varchar
);
```

**portraits**
```sql
CREATE TABLE portraits (
    id bigint PRIMARY KEY,
    book_id bigint REFERENCES books(id),
    style_id bigint REFERENCES artist_styles(id),
    worker_id bigint REFERENCES workers(id),
    status bpchar,
    image_key varchar,
    proof_status bpchar,
    proof_feedback text,
    completed_at timestamptz,
    created_at timestamptz
);
```

### Status Codes
**portraits.status**
- 'P' = Pending
- 'I' = In Progress
- 'C' = Complete

**portraits.proof_status**
- 'W' = Waiting
- 'A' = Approved
- 'R' = Rejected

## Core Application Requirements

### Authentication
- Using clerk.com for all authentication
- Worker roles managed through clerk.com
- No need to implement user registration - all accounts created by admin

### Main Worker View
Required components:
1. Protected route requiring clerk.com authentication
2. Auto-assignment of oldest pending portrait
3. Display of reference photo
4. Processed prompt display showing:
   - Original artist style template
   - Processed template with recipient age/gender inserted
5. Copy button for processed prompt
6. Submission form for Midjourney URL

### Prompt Template Processing
- Artist style templates contain placeholders:
  - `{age}` - replaced with recipient's age
  - `{gender}` - replaced with recipient's gender
- Example template:
  ```
  portrait of a {age} year old {gender}, in the style of [artist], vibrant colors
  ```
- Example processed:
  ```
  portrait of a 7 year old girl, in the style of [artist], vibrant colors
  ```

### Key Database Queries

**Get Next Available Portrait**
```sql
SELECT 
    p.*,
    r.photo_key as reference_photo_url,
    r.age as recipient_age,
    r.gender as recipient_gender,
    s.prompt_template,
    s.name as style_name
FROM portraits p
JOIN recipients r ON p.book_id = r.id
JOIN artist_styles s ON p.style_id = s.id
WHERE p.status = 'P' 
AND p.worker_id IS NULL
ORDER BY p.created_at ASC 
LIMIT 1;
```

**Submit Completed Portrait**
```sql
UPDATE portraits
SET 
    status = 'C',
    worker_id = :worker_id,
    image_key = :midjourney_url,
    completed_at = NOW()
WHERE id = :portrait_id;
```

### API Endpoints Needed

**GET /api/portraits/next**
- Protected by clerk.com authentication
- Returns next available portrait with related data
- Response includes reference photo URL and artist template

**POST /api/portraits/:id/submit**
- Protected by clerk.com authentication
- Accepts Midjourney URL
- Updates portrait status and worker assignment
- Triggers next portrait assignment

### UI Requirements

**Layout Structure**
```jsx
<ClerkProvider>
  <ProtectedRoute>
    <WorkerDashboard>
      <PortraitAssignment>
        <ReferencePhoto />
        <PromptSection>
          <OriginalTemplate />
          <ProcessedPrompt />
          <CopyPromptButton />
        </PromptSection>
        <URLSubmissionForm />
      </PortraitAssignment>
    </WorkerDashboard>
  </ProtectedRoute>
</ClerkProvider>
```

**ProcessedPrompt Component**
```jsx
const ProcessedPrompt = ({ 
  template, 
  recipientAge, 
  recipientGender 
}) => {
  const processedText = template
    .replace('{age}', recipientAge)
    .replace('{gender}', recipientGender);
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processed Prompt</CardTitle>
      </CardHeader>
      <CardContent>
        <pre>{processedText}</pre>
        <Button
          onClick={() => navigator.clipboard.writeText(processedText)}
        >
          Copy to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
};

**Required UI Components (shadcn/ui)**
- Card (for portrait display)
- Form (for URL submission)
- Button (for submission)
- Alert (for errors/success)
- Loading states

### Error Handling
Required error states:
- No portraits available
- Invalid Midjourney URL format
- Authentication errors
- Network failures
- Database errors

### Data Flow
1. Worker authentication via clerk.com
2. Auto-fetch next portrait
3. Display reference materials
4. Accept Midjourney URL
5. Update portrait record
6. Auto-fetch next assignment

## Technical Stack
- Next.js (App Router)
- Vercel deployment
- shadcn/ui components
- clerk.com authentication
- Supabase database

## Implementation Notes
- All database tables already exist - no migrations needed
- Use Supabase client for database operations
- Implement clerk.com middleware for route protection
- Use React Server Components where possible
- Implement error boundaries
- Add loading states for all async operations

## Expected Environment Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```