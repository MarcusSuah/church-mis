import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { promiseAction } from '@/lib/promise-action';

interface Permission {
    id: number;
    name: string;
    module: string;
    description: string | null;
}

interface Role {
    id: number;
    name: string;
    label: string;
    is_protected: boolean;
    users_count: number;
    permission_ids: number[];
}

interface PaginatedRoles {
    data: Role[];
    from: number | null;
    to: number | null;
    total: number;
    first_page_url: string | null;
    prev_page_url: string | null;
    next_page_url: string | null;
    last_page_url: string | null;
}

interface Props {
    roles: PaginatedRoles;
    permissions: Permission[];
    filters: {
        search?: string;
        per_page?: string;
    };
}

type RoleForm = {
    name: string;
    permissions: number[];
};

export default function Index({ roles, permissions, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);

    const createForm = useForm<RoleForm>({ name: '', permissions: [] });
    const editForm = useForm<RoleForm>({ name: '', permissions: [] });

    const modules = useMemo(
        () => [...new Set(permissions.map((p) => p.module))],
        [permissions],
    );

    const updateFilters = (
        next: Partial<{ search: string; per_page: string }>,
    ) => {
        router.get(
            '/admin/roles',
            {
                search: (next.search ?? filters.search) || undefined,
                per_page: next.per_page ?? filters.per_page ?? undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    // Live (debounced) search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                updateFilters({ search });
            }
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const togglePermission = (
        form: typeof createForm,
        permissionId: number,
        checked: boolean,
    ) => {
        form.setData(
            'permissions',
            checked
                ? [...form.data.permissions, permissionId]
                : form.data.permissions.filter((id) => id !== permissionId),
        );
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        const promise = new Promise<void>((resolve, reject) => {
            createForm.post('/admin/roles', {
                preserveScroll: true,
                onSuccess: () => {
                    setCreateOpen(false);
                    createForm.reset();
                    resolve();
                },
                onError: (errors) => reject(errors),
            });
        });

        toast.promise(promise, {
            loading: 'Creating role...',
            success: 'Role created.',
            error: 'Please check the form for errors.',
        });
    };

    const openEdit = (role: Role) => {
        setEditRole(role);
        editForm.setData({
            name: role.name,
            permissions: role.permission_ids,
        });
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();
        if (!editRole) return;

        const promise = new Promise<void>((resolve, reject) => {
            editForm.put(`/admin/roles/${editRole.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditRole(null);
                    resolve();
                },
                onError: (errors) => reject(errors),
            });
        });

        toast.promise(promise, {
            loading: 'Saving changes...',
            success: `${editRole.label} has been updated.`,
            error: (errors: Record<string, string>) =>
                errors?.name ??
                errors?.role ??
                'Please check the form for errors.',
        });
    };

    const confirmDelete = () => {
        if (!deleteRole) return;

        promiseAction(`/admin/roles/${deleteRole.id}`, {
            method: 'delete',
            loading: 'Deleting role...',
            success: `${deleteRole.label} has been deleted.`,
        });

        setDeleteRole(null);
    };

    const renderPermissionFields = (form: typeof createForm) => (
        <div className="grid gap-4">
            {modules.map((mod) => (
                <div key={mod}>
                    <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {mod}
                    </p>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {permissions
                            .filter((permission) => permission.module === mod)
                            .map((permission) => (
                                <label
                                    key={permission.id}
                                    className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                                >
                                    <Checkbox
                                        checked={form.data.permissions.includes(
                                            permission.id,
                                        )}
                                        onCheckedChange={(checked) =>
                                            togglePermission(
                                                form,
                                                permission.id,
                                                !!checked,
                                            )
                                        }
                                    />

                                    <span>
                                        <span className="block font-medium">
                                            {permission.name}
                                        </span>
                                        {permission.description && (
                                            <span className="block text-xs text-muted-foreground">
                                                {permission.description}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <Head title="Roles" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Roles
                        </h1>
                        <p className="text-muted-foreground">
                            Manage roles and the permissions granted to them.
                        </p>
                    </div>

                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Role
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Roles</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {/* Filters */}
                        <div className="mb-6 flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search roles..."
                                    value={search}
                                    className="w-full max-w-sm pl-9"
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-center">
                                            Permissions
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Users
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {roles.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="h-32 text-center"
                                            >
                                                No roles found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        roles.data.map((role) => (
                                            <TableRow key={role.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-medium">
                                                        {role.label}
                                                        {role.is_protected && (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1"
                                                            >
                                                                <ShieldAlert className="h-3 w-3" />
                                                                System
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {role.permission_ids.length}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {role.users_count}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            title="Edit"
                                                            onClick={() =>
                                                                openEdit(role)
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            title="Delete"
                                                            disabled={
                                                                role.is_protected
                                                            }
                                                            onClick={() =>
                                                                setDeleteRole(
                                                                    role,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-6 flex items-center justify-between px-2">
                            <div className="flex-1 text-sm text-muted-foreground">
                                Showing {roles.from ?? 0} to {roles.to ?? 0} of{' '}
                                {roles.total} role(s).
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="hidden size-8 lg:flex"
                                    onClick={() =>
                                        goToPage(roles.first_page_url)
                                    }
                                    disabled={!roles.prev_page_url}
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
                                        goToPage(roles.prev_page_url)
                                    }
                                    disabled={!roles.prev_page_url}
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
                                        goToPage(roles.next_page_url)
                                    }
                                    disabled={!roles.next_page_url}
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
                                        goToPage(roles.last_page_url)
                                    }
                                    disabled={!roles.next_page_url}
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

            {/* Create Role */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[640px]">
                    <form onSubmit={submitCreate}>
                        <DialogHeader>
                            <DialogTitle>Add Role</DialogTitle>
                            <DialogDescription>
                                Choose the permissions this role should be
                                granted.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-role-name">
                                    Role Name
                                </Label>
                                <Input
                                    id="create-role-name"
                                    placeholder="e.g. accountant"
                                    value={createForm.data.name}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-red-500">
                                        {createForm.errors.name}
                                    </p>
                                )}
                            </div>

                            {renderPermissionFields(createForm)}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Creating...'
                                    : 'Create Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role */}
            <Dialog
                open={!!editRole}
                onOpenChange={(open) => !open && setEditRole(null)}
            >
                <DialogContent className="sm:max-w-[640px]">
                    <form onSubmit={submitEdit}>
                        <DialogHeader>
                            <DialogTitle>Edit Role</DialogTitle>
                        </DialogHeader>

                        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role-name">
                                    Role Name
                                </Label>
                                <Input
                                    id="edit-role-name"
                                    value={editForm.data.name}
                                    disabled={editRole?.is_protected}
                                    onChange={(event) =>
                                        editForm.setData(
                                            'name',
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

                            {renderPermissionFields(editForm)}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditRole(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                {editForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteRole}
                onOpenChange={(open) => !open && setDeleteRole(null)}
                title="Delete Role"
                description={
                    <>
                        Are you sure you want to delete{' '}
                        <strong>{deleteRole?.label}</strong>? This cannot be
                        undone.
                    </>
                }
                confirmLabel="Delete Role"
                variant="destructive"
                onConfirm={confirmDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Roles', href: '/admin/roles' }],
};
