# Setup guide — new features

This covers the four features added: rider item verification, the complaint
chatbot, store credits, and COD + invoices. I don't have network access to
your live Supabase project, so the DB changes are provided as migration
files you need to apply yourself.

## 1. Apply the SQL migrations

Two new files were added under `supabase/migrations/`:

- `20260820000000_functional_additions.sql` — new tables, columns, RLS
  policies, and functions/triggers for item verification, support tickets,
  credits, and COD.
- `20260820000001_storage_buckets.sql` — two new storage buckets
  (`item-verification-photos`, `ticket-evidence-photos`).

Apply them with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the contents of each file into the SQL editor in the Supabase
dashboard, in order, if you're not using the CLI/migration workflow.

**Note on `orders.customer_id`:** the migration assumes your `orders` table
already has `customer_id`, `total_amount`, and `status` columns (it does,
based on the existing code) — it only *adds* new columns/tables, it doesn't
touch what's already there.

**Storage buckets:** if your project already manages buckets by hand rather
than via migration (your existing `delivery-task-photos` bucket isn't in
any migration file, so it looks like it was created manually), just create
these two buckets the same way instead of running the second file:
- `item-verification-photos` (public)
- `ticket-evidence-photos` (public)

## 2. Environment variables

No new environment variables are required. The credits admin action uses
your existing `createAdminClient()` helper (service role key), same as
other admin server actions already in the codebase.

## 3. What was added, file by file

**Rider item verification**
- `supabase/migrations/...` — `delivery_task_item_reports` table
- `src/app/actions/item-verification.ts`
- `src/components/rider/ItemVerification.tsx`
- Wired into `src/app/(authenticated)/rider/tasks/[id]/page.tsx`
- Shown read-only (with photos) on `src/app/(authenticated)/admin/orders/[id]/page.tsx`

**Complaint chatbot**
- `supabase/migrations/...` — `support_tickets` table
- `src/app/actions/support-tickets.ts`
- `src/components/support/ComplaintChatbot.tsx` (scripted, no AI calls)
- `src/app/(authenticated)/support/page.tsx` (customer entry point)
- `src/components/admin/SupportTicketsManager.tsx` + `src/app/(authenticated)/admin/support/page.tsx`

**Store credits**
- `supabase/migrations/...` — `credit_settings`, `customer_credits`,
  `award_order_credits()` trigger (fires on any transition to `DELIVERED`,
  regardless of whether the admin or the rider's OTP flow triggered it),
  `redeem_customer_credits()`, `get_available_credit_balance()`
- `src/app/actions/credits.ts`
- `src/components/admin/CreditsSettings.tsx` — added to `/admin/pricing`
- Dashboard "Laundry Coins" card now shows real balance + next expiry
- Checkout now has an "Use my Laundry Coins" toggle that redeems the
  balance against the order total

**COD + Invoices**
- `orders.payment_method`, `orders.cod_collected_at`, `orders.cod_collected_by`,
  `orders.credits_applied` columns added
- `src/app/(authenticated)/cart/actions.ts` — COD branch skips Razorpay
  entirely; order is placed with `payment_status = 'COD_PENDING'`
- Rider must tap **"Confirm cash collected"**
  (`src/components/rider/CodCollectionButton.tsx` /
  `src/app/actions/cod-collection.ts`) before the delivery OTP step will
  succeed — enforced server-side in `verifyDeliveryOtpAction`
- `src/app/(authenticated)/orders/[id]/invoice/page.tsx` — printable
  invoice (browser print → Save as PDF), linked from the order detail page
  once `payment_status = 'PAID'` (or COD + delivered)

## 4. Known follow-ups / things you may want to adjust

- **Credit redemption on Razorpay orders**: if a customer applies enough
  credits to bring the payable total to ₹0 on the online-payment path, the
  Razorpay checkout would receive a zero amount, which Razorpay rejects.
  Right now nothing forces a minimum — worth adding a "minimum ₹1 payable
  online" rule if this comes up in testing.
- **COD payment_status**: COD orders sit at `payment_status = 'COD_PENDING'`
  until the rider confirms collection, at which point it flips to `'PAID'`.
  If you want admins to also be able to manually mark COD as collected
  (e.g. if a rider forgets), that's an easy addition to the existing admin
  order actions file — just wasn't explicitly requested.
- **Ticket → order linkage**: a ticket can optionally reference a specific
  `order_item_id`; the chatbot lets the customer pick "not sure / multiple
  items" if they don't know which one, in which case it's left blank.
