# Authorization & Access Control

## Roles

- `owner`: Full workspace authority (projects, tasks, deliverables, client billing, member management).
- `admin`: Operational management (can create, edit, approve, and archive deliverables and projects).
- `member`: Scoped operational access.

## Deliverable Access Control

1. **Creation & Management**:
   - Owners and Admins can create and configure deliverables, link projects/milestones, and assign contributors and reviewers.
2. **Contributor Privileges**:
   - Assigned contributors can edit draft deliverables, upload files via presigned URLs, and submit/resubmit work for review.
3. **Reviewer Privileges & Self-Approval Prevention**:
   - Only assigned reviewers or Owners/Admins may approve submissions or request revisions.
   - Contributors are strictly forbidden from approving their own deliverables unless they hold the workspace Owner or Admin role.
4. **File Protection**:
   - All presigned download URLs require authenticated workspace and deliverable verification.
   - Knowing an opaque storage key alone is insufficient to access private cloud storage objects.
   - Storage presigned URLs expire after 1 hour (3600 seconds).

## Analytics and financial reporting

Dashboard operational metrics are available to every verified workspace member. Financial metrics (successful-payment revenue, invoice balances, invoice/payment rows, financial activity, and CSV reports) are only returned to owners and admins. This restriction is enforced in the analytics service and is not only a UI toggle.
