import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    Pencil,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCheck,
    UserX,
    X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { promiseAction } from "@/lib/promise-action";
import { UserAvatar } from "@/components/user-avatar";
import { UserStatusBadge } from "@/components/user-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import admin from "@/routes/admin";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";

type UserStatus = "pending" | "approved" | "rejected";
type DisplayStatus = "pending" | "active" | "inactive" | "rejected";

interface Reviewer {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    status: UserStatus;
    display_status: DisplayStatus;
    is_active: boolean;
    must_change_credentials: boolean;
    reviewed_by: number | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    reviewer: Reviewer | null;
    created_at: string | null;
    roles: { id: number; name: string }[];
    role: string | null;
    /** Superadmin accounts can never be deleted. */
    is_protected: boolean;
    /** Server decides (Phase 4, F08): outranks the account and it isn't you. */
    can_assign_roles: boolean;
}

interface AssignableRole {
    id: number;
    name: string;
    label: string;
    /** False when the role has permissions you don't have, or is Superadmin/Admin. */
    assignable: boolean;
}

interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    path: string;
    first_page_url: string | null;
    prev_page_url: string | null;
    next_page_url: string | null;
    last_page_url: string | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Props {
    users: PaginatedUsers;
    assignableRoles: AssignableRole[];
    filters: {
        search?: string;
        status?: string;
        is_active?: string;
        per_page?: string;
    };
}

export default function Index({ users, filters, assignableRoles = [] }: Props) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [editUser, setEditUser] = useState<User | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [approveUser, setApproveUser] = useState<User | null>(null);
    const [rejectUser, setRejectUser] = useState<User | null>(null);
    const [deleteUser, setDeleteUser] = useState<User | null>(null);
    const [toggleTarget, setToggleTarget] = useState<User | null>(null);
    const [rolesUser, setRolesUser] = useState<User | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [savingRoles, setSavingRoles] = useState(false);

    const openRoles = (user: User) => {
        setRolesUser(user);
        setSelectedRoles(user.roles.map((r) => r.name));
    };

    const toggleRole = (name: string, on: boolean) =>
        setSelectedRoles((current) => (on ? [...new Set([...current, name])] : current.filter((r) => r !== name)));

    const saveRoles = () => {
        if (!rolesUser) {
            return;
        }
        setSavingRoles(true);
        router.put(
            `/admin/users/${rolesUser.id}/roles`,
            { roles: selectedRoles },
            {
                preserveScroll: true,
                onSuccess: () => setRolesUser(null),
                onFinish: () => setSavingRoles(false),
            },
        );
    };

    const editForm = useForm({
        _method: "put" as const,
        name: "",
        email: "",
        phone: "",
        is_active: true,
        must_change_credentials: false,
        avatar: null as File | null,
    });

    const rejectForm = useForm({
        rejection_reason: "",
    });

    // Revoke blob preview URLs when they're replaced/unmounted.
    useEffect(() => {
        return () => {
            if (avatarPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const updateFilters = (
        next: Partial<{ search: string; status: string; per_page: string }>,
    ) => {
        router.get(
            "/admin/users",
            {
                search: (next.search ?? filters.search) || undefined,
                status: (next.status ?? filters.status) || undefined,
                is_active: filters.is_active || undefined,
                per_page: next.per_page ?? filters.per_page ?? undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    // Live (debounced) search.
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search ?? "")) {
                updateFilters({ search });
            }
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const filterStatus = (value: string) => {
        updateFilters({ status: value === "all" ? "" : value });
    };

    const setPerPage = (value: string) => {
        updateFilters({ per_page: value });
    };

    const goToPage = (url: string | null) => {
        if (!url) {
            return;
        }

        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const openEditModal = (user: User) => {
        setEditUser(user);
        setAvatarPreview(user.avatar);

        editForm.setData({
            _method: "put",
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            is_active: user.is_active,
            must_change_credentials: user.must_change_credentials,
            avatar: null,
        });
    };

    const closeEditModal = () => {
        setEditUser(null);
        setAvatarPreview(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        editForm.setData("avatar", file);
        setAvatarPreview(
            file ? URL.createObjectURL(file) : (editUser?.avatar ?? null),
        );
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();

        if (!editUser) {
            return;
        }

        const promise = new Promise<void>((resolve, reject) => {
            editForm.post(`/admin/users/${editUser.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    closeEditModal();
                    resolve();
                },
                onError: (errors) => reject(errors),
            });
        });

        toast.promise(promise, {
            loading: "Saving changes...",
            success: `${editUser.name} has been updated.`,
            error: "Please check the form for errors.",
        });
    };

    const approve = () => {
        if (!approveUser) {
            return;
        }

        promiseAction(`/admin/users/${approveUser.id}/approve`, {
            loading: "Approving user...",
            success: `${approveUser.name} has been approved.`,
        });

        setApproveUser(null);
    };

    const reject = (event: FormEvent) => {
        event.preventDefault();

        if (!rejectUser) {
            return;
        }

        const promise = new Promise<void>((resolve, reject) => {
            rejectForm.post(`/admin/users/${rejectUser.id}/reject`, {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectUser(null);
                    rejectForm.reset();
                    resolve();
                },
                onError: (errors) => reject(errors),
            });
        });

        toast.promise(promise, {
            loading: "Rejecting user...",
            success: `${rejectUser.name} has been rejected.`,
            error: (errors: Record<string, string>) =>
                errors?.rejection_reason ??
                errors?.user ??
                "Something went wrong.",
        });
    };

    const toggleActive = (user: User) => {
        const url = user.is_active
            ? `/admin/users/${user.id}/deactivate`
            : `/admin/users/${user.id}/activate`;

        promiseAction(url, {
            loading: user.is_active
                ? "Deactivating user..."
                : "Activating user...",
            success: user.is_active
                ? `${user.name} has been deactivated.`
                : `${user.name} has been activated.`,
        });
    };

    const confirmToggle = () => {
        if (!toggleTarget) {
            return;
        }

        toggleActive(toggleTarget);
        setToggleTarget(null);
    };

    const deleteAccount = () => {
        if (!deleteUser) {
            return;
        }

        promiseAction(`/admin/users/${deleteUser.id}`, {
            method: "delete",
            loading: "Deleting user...",
            success: `${deleteUser.name} has been deleted.`,
        });

        setDeleteUser(null);
    };

    return (
        <>
            <Head title="User Management" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            User Management
                        </h1>

                        <p className="text-muted-foreground">
                            Manage user accounts, approvals, and access.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/admin/users/pending">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Pending Approvals
                        </Link>
                    </Button>
                </div>

                {/* Main Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {/* Filters */}
                        <div className="mb-6 flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

                                <Input
                                    placeholder="Search by name, email, or phone..."
                                    value={search}
                                    className="w-full max-w-sm pl-9"
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />
                            </div>

                            <Select
                                value={filters.status || "all"}
                                onValueChange={filterStatus}
                            >
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
                                    </SelectItem>

                                    <SelectItem value="pending">
                                        Pending
                                    </SelectItem>

                                    <SelectItem value="approved">
                                        Approved
                                    </SelectItem>

                                    <SelectItem value="rejected">
                                        Rejected
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Reviewed By</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-32 text-center"
                                            >
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar
                                                            name={user.name}
                                                            avatar={user.avatar}
                                                        />

                                                        <div>
                                                            <div className="font-medium">
                                                                {user.name}
                                                            </div>

                                                            <div className="text-muted-foreground text-sm">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {user.phone || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {user.roles.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.roles.map(
                                                                (role) => (
                                                                    <Badge
                                                                        key={
                                                                            role.id
                                                                        }
                                                                        variant="outline"
                                                                        className="text-lgbg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                                                    >
                                                                        {
                                                                            role.name
                                                                        }
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <UserStatusBadge
                                                        status={
                                                            user.display_status
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    {user.reviewer?.name || "—"}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            title="view"
                                                            variant="outline"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/admin/users/${user.id}`}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>

                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            title="edit"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    user,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>

                                                        {user.can_assign_roles && (
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                title="roles"
                                                                onClick={() => openRoles(user)}
                                                            >
                                                                <ShieldCheck className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        {user.status ===
                                                            "pending" && (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        title="approve"
                                                                        onClick={() =>
                                                                            setApproveUser(
                                                                                user,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>

                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        title="reject"
                                                                        onClick={() =>
                                                                            setRejectUser(
                                                                                user,
                                                                            )
                                                                        }
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                        {user.status ===
                                                            "approved" && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    title={
                                                                        user.is_active
                                                                            ? "deactivate"
                                                                            : "activate"
                                                                    }
                                                                    onClick={() =>
                                                                        setToggleTarget(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    {user.is_active ? (
                                                                        <UserX className="h-4 w-4" />
                                                                    ) : (
                                                                        <UserCheck className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            )}

                                                        {user.is_protected ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1"
                                                                title="Superadmin accounts cannot be deleted"
                                                            >
                                                                <ShieldAlert className="h-3 w-3" />
                                                                Protected
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                size="icon"
                                                                title="delete"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    setDeleteUser(
                                                                        user,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {/* Pagination */}
                        <div className="mt-6 flex items-center justify-between px-2">
                            <div className="text-muted-foreground flex-1 text-sm">
                                Showing {users.from ?? 0} to {users.to ?? 0} of{" "}
                                {users.total} user(s).
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="hidden size-8 lg:flex"
                                    onClick={() =>
                                        goToPage(users.first_page_url)
                                    }
                                    disabled={!users.prev_page_url}
                                >
                                    <span className="sr-only">
                                        Go to first page
                                    </span>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                        goToPage(users.prev_page_url)
                                    }
                                    disabled={!users.prev_page_url}
                                >
                                    <span className="sr-only">
                                        Go to previous page
                                    </span>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                        goToPage(users.next_page_url)
                                    }
                                    disabled={!users.next_page_url}
                                >
                                    <span className="sr-only">
                                        Go to next page
                                    </span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="hidden size-8 lg:flex"
                                    onClick={() =>
                                        goToPage(users.last_page_url)
                                    }
                                    disabled={!users.next_page_url}
                                >
                                    <span className="sr-only">
                                        Go to last page
                                    </span>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Roles Modal (Phase 4, F08): the server re-checks every change. */}
            <Dialog open={!!rolesUser} onOpenChange={(open) => !open && setRolesUser(null)}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Roles for {rolesUser?.name}</DialogTitle>
                        <DialogDescription>
                            Roles you can't give are greyed out: they include permissions you don't have, or only the Super Admin can give them.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        {assignableRoles.map((role) => {
                            const checked = selectedRoles.includes(role.name);
                            const locked = !role.assignable;

                            return (
                                <label key={role.id} className={`flex items-center gap-3 text-sm ${locked ? "opacity-50" : ""}`}>
                                    <Checkbox
                                        checked={checked}
                                        disabled={locked}
                                        onCheckedChange={(value) => toggleRole(role.name, value === true)}
                                    />
                                    <span>{role.label}</span>
                                </label>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRolesUser(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveRoles} disabled={savingRoles || selectedRoles.length === 0}>
                            {savingRoles ? "Saving..." : "Save Roles"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Modal */}
            <Dialog
                open={!!editUser}
                onOpenChange={(open) => !open && closeEditModal()}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>

                        <DialogDescription>
                            Update this user's account information and access
                            settings.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitEdit}>
                        <div className="grid gap-5 py-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage
                                        src={avatarPreview ?? undefined}
                                        alt={editForm.data.name}
                                    />
                                    <AvatarFallback>
                                        {editForm.data.name
                                            .split(" ")
                                            .map((part) => part[0])
                                            .slice(0, 2)
                                            .join("")
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="grid flex-1 gap-1.5">
                                    <Label htmlFor="avatar">
                                        Profile Photo
                                    </Label>

                                    <Input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={onAvatarChange}
                                    />

                                    {editForm.errors.avatar && (
                                        <p className="text-sm text-red-500">
                                            {editForm.errors.avatar}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>

                                <Input
                                    id="name"
                                    value={editForm.data.name}
                                    onChange={(event) =>
                                        editForm.setData(
                                            "name",
                                            event.target.value,
                                        )
                                    }
                                />

                                {editForm.errors.name && (
                                    <p className="text-sm text-red-500">
                                        {editForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(event) =>
                                        editForm.setData(
                                            "email",
                                            event.target.value,
                                        )
                                    }
                                />

                                {editForm.errors.email && (
                                    <p className="text-sm text-red-500">
                                        {editForm.errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>

                                <Input
                                    id="phone"
                                    value={editForm.data.phone}
                                    onChange={(event) =>
                                        editForm.setData(
                                            "phone",
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>

                            <FieldGroup>
                                <FieldLabel htmlFor="is_active">
                                    <Field orientation="horizontal">
                                        <FieldContent>
                                            <FieldTitle>
                                                Account Active
                                            </FieldTitle>
                                            <FieldDescription>
                                                Allow this user to access the
                                                system.
                                            </FieldDescription>
                                        </FieldContent>

                                        <Switch
                                            id="is_active"
                                            checked={editForm.data.is_active}
                                            onCheckedChange={(checked) =>
                                                editForm.setData(
                                                    "is_active",
                                                    checked,
                                                )
                                            }
                                        />
                                    </Field>
                                </FieldLabel>

                                <FieldLabel htmlFor="must_change_credentials">
                                    <Field orientation="horizontal">
                                        <FieldContent>
                                            <FieldTitle>
                                                Require Credential Change
                                            </FieldTitle>
                                            <FieldDescription>
                                                Require the user to change their
                                                credentials.
                                            </FieldDescription>
                                        </FieldContent>

                                        <Switch
                                            id="must_change_credentials"
                                            checked={
                                                editForm.data
                                                    .must_change_credentials
                                            }
                                            onCheckedChange={(checked) =>
                                                editForm.setData(
                                                    "must_change_credentials",
                                                    checked,
                                                )
                                            }
                                        />
                                    </Field>
                                </FieldLabel>
                            </FieldGroup>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditModal}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                {editForm.processing
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Approve Confirmation */}
            <ConfirmDialog
                open={!!approveUser}
                onOpenChange={(open) => !open && setApproveUser(null)}
                title="Approve User"
                description={
                    <>
                        Are you sure you want to approve{" "}
                        <strong>{approveUser?.name}</strong>? This will activate
                        their account and allow them to access the application.
                    </>
                }
                confirmLabel="Approve User"
                onConfirm={approve}
            />

            {/* Activate / Deactivate Confirmation */}
            <ConfirmDialog
                open={!!toggleTarget}
                onOpenChange={(open) => !open && setToggleTarget(null)}
                title={
                    toggleTarget?.is_active
                        ? "Deactivate User"
                        : "Activate User"
                }
                description={
                    toggleTarget?.is_active ? (
                        <>
                            Are you sure you want to deactivate{" "}
                            <strong>{toggleTarget?.name}</strong>? They will
                            immediately lose access to the application.
                        </>
                    ) : (
                        <>
                            Are you sure you want to activate{" "}
                            <strong>{toggleTarget?.name}</strong>? They will
                            regain access to the application.
                        </>
                    )
                }
                confirmLabel={
                    toggleTarget?.is_active ? "Deactivate" : "Activate"
                }
                variant={toggleTarget?.is_active ? "destructive" : "default"}
                onConfirm={confirmToggle}
            />

            {/* Reject Modal (needs a text field, so it stays a Dialog) */}
            <Dialog
                open={!!rejectUser}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejectUser(null);
                        rejectForm.reset();
                    }
                }}
            >
                <DialogContent>
                    <form onSubmit={reject}>
                        <DialogHeader>
                            <DialogTitle>Reject User</DialogTitle>

                            <DialogDescription>
                                Provide a reason for rejecting{" "}
                                <strong>{rejectUser?.name}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <Label htmlFor="rejection_reason">
                                Rejection Reason
                            </Label>

                            <Textarea
                                id="rejection_reason"
                                className="mt-2"
                                placeholder="Explain why this registration is being rejected..."
                                value={rejectForm.data.rejection_reason}
                                onChange={(event) =>
                                    rejectForm.setData(
                                        "rejection_reason",
                                        event.target.value,
                                    )
                                }
                            />

                            {rejectForm.errors.rejection_reason && (
                                <p className="mt-1 text-sm text-red-500">
                                    {rejectForm.errors.rejection_reason}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectUser(null)}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={rejectForm.processing}
                            >
                                {rejectForm.processing
                                    ? "Rejecting..."
                                    : "Reject User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteUser}
                onOpenChange={(open) => !open && setDeleteUser(null)}
                title="Delete User"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteUser?.name}</strong>? The account will be
                        moved to the trash.
                    </>
                }
                confirmLabel="Delete User"
                variant="destructive"
                onConfirm={deleteAccount}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: "User Management",
            href: admin,
        },
    ],
};
