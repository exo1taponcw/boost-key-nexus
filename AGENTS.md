<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Boost delivery is isolated in `deliverBoosts()` in src/lib/boost.functions.ts (currently simulated) so a real provider can be swapped in without touching the UI or redemption logic.
- Admin data access goes through the browser client under RLS gated by `has_role(admin)`; the first signed-up account is auto-granted admin by a database trigger.
