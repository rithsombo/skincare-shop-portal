# Company Access RBAC

This project uses three company roles:

- `owner`
- `admin`
- `member`

## Company-scoped rules

- Any authenticated user may read members for companies they belong to.
- Only `owner` and `admin` may create or revoke access.
- `admin` may not assign or manage the `owner` role.
- Users may not change or remove their own membership from the members screen.
- Pending invitations are listed only for managers.
- Pending invitations shown to the current user exclude companies they already belong to.

## Expected flows

- A user with one company can work normally in that company.
- A user with multiple companies can switch company context from the header.
- A user with no companies sees pending invitations and can accept one.
- A user already in company `A` can still accept an invitation to company `B`.
- Switching into a company where the user is only a `member` must not trigger admin-only errors during normal navigation.
