import { Head, router, useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    roles_count: number;
}

interface PaginatedPermissions {
    data: Permission[];
    from: number | null;
    to: number | null;
    total: number;
    first_page_url: string | null;
    prev_page_url: string | null;
    next_page_url: string | null;
    last_page_url: string | null;
}

interface Props {
    permissions: PaginatedPermissions;
    modules: string[];
    filters: {
        search?: string;
        module?: string;
        per_page?: string;
    };
}

export default function Index({ permissions, modules, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editPermission, setEditPermission] = useState<Permission | null>(
        null,
    );
    const [deletePermission, setDeletePermission] = useState<Permission | null>(
        null,
    );

    const createForm = useForm({
        name: '',
        module: '',
        description: '',
    });

    const editForm = useForm({
        name: '',
        module: '',
        description: '',
    });

    const updateFilters = (
        next: Partial<{ search: string; module: string; per_page: string }>,
    ) => {
        router.get(
            '/admin/permissions',
            {
                search: (next.search ?? filters.search) || undefined,
                module: (next.module ?? filters.module) || undefined,
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

    const filterModule = (value: string) => {
        updateFilters({ module: value === 'all' ? '' : value });
    };

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();

        const promise = new Promise<void>((resolve, reject) => {
            createForm.post('/admin/permissions', {
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
            loading: 'Creating permission...',
            success: 'Permission created.',
            error: 'Please check the form for errors.',
        });
    };

    const openEdit = (permission: Permission) => {
        setEditPermission(permission);
        editForm.setData({
            name: permission.name,
            module: permission.module,
            description: permission.description ?? '',
        });
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();
        if (!editPermission) return;

        const promise = new Promise<void>((resolve, reject) => {
            editForm.put(`/admin/permissions/${editPermission.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditPermission(null);
                    resolve();
                },
                onError: (errors) => reject(errors),
            });
        });

        toast.promise(promise, {
            loading: 'Saving changes...',
            success: 'Permission updated.',
            error: 'Please check the form for errors.',
        });
    };

    const confirmDelete = () => {
        if (!deletePermission) return;

        promiseAction(`/admin/permissions/${deletePermission.id}`, {
            method: 'delete',
            loading: 'Deleting permission...',
            success: `${deletePermission.name} has been deleted.`,
        });

        setDeletePermission(null);
    };

    return (
        <>
            <Head title="Permissions" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Permissions
                        </h1>
                        <p className="text-muted-foreground">
                            Manage the permissions roles can be granted.
                        </p>
                    </div>

                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Permission
                    </Button>
                </div>

                {/* Main Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Permissions</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {/* Filters */}
                        <div className="mb-6 flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, module, or description..."
                                    value={search}
                                    className="w-full max-w-sm pl-9"
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />
                            </div>

                            <Select
                                value={filters.module || 'all'}
                                onValueChange={filterModule}
                            >
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Module" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Modules
                                    </SelectItem>
                                    {modules.map((mod) => (
                                        <SelectItem key={mod} value={mod}>
                                            {mod}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Module</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-center">
                                            Roles
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {permissions.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-32 text-center"
                                            >
                                                No permissions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        permissions.data.map((permission) => (
                                            <TableRow key={permission.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {permission.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {permission.module}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {permission.description ||
                                                        '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {permission.roles_count}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            title="Edit"
                                                            onClick={() =>
                                                                openEdit(
                                                                    permission,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            title="Delete"
                                                            onClick={() =>
                                                                setDeletePermission(
                                                                    permission,
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
                                Showing {permissions.from ?? 0} to{' '}
                                {permissions.to ?? 0} of {permissions.total}{' '}
                                permission(s).
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="hidden size-8 lg:flex"
                                    onClick={() =>
                                        goToPage(permissions.first_page_url)
                                    }
                                    disabled={!permissions.prev_page_url}
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
                                        goToPage(permissions.prev_page_url)
                                    }
                                    disabled={!permissions.prev_page_url}
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
                                        goToPage(permissions.next_page_url)
                                    }
                                    disabled={!permissions.next_page_url}
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
                                        goToPage(permissions.last_page_url)
                                    }
                                    disabled={!permissions.next_page_url}
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

            {/* Create Permission Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create Permission</DialogTitle>
                        <DialogDescription>
                            Create a new permission that can be assigned to
                            roles.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCreate} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="create-name">Permission Name</Label>

                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. members.create"
                                autoComplete="off"
                            />

                            {createForm.errors.name && (
                                <p className="text-sm text-destructive">
                                    {createForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-module">Module</Label>

                            <Input
                                id="create-module"
                                value={createForm.data.module}
                                onChange={(event) =>
                                    createForm.setData(
                                        'module',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. Members"
                                autoComplete="off"
                            />

                            {createForm.errors.module && (
                                <p className="text-sm text-destructive">
                                    {createForm.errors.module}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-description">
                                Description
                            </Label>

                            <Textarea
                                id="create-description"
                                value={createForm.data.description}
                                onChange={(event) =>
                                    createForm.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                placeholder="Describe what this permission allows..."
                                rows={4}
                            />

                            {createForm.errors.description && (
                                <p className="text-sm text-destructive">
                                    {createForm.errors.description}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setCreateOpen(false);
                                    createForm.reset();
                                    createForm.clearErrors();
                                }}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Creating...'
                                    : 'Create Permission'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Permissions', href: '/admin/permissions' }],
};
