import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  GripVertical,
  Hash,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Channel } from "@/hooks/useChannels";
import {
  ChannelCategory,
  useChannelCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  useAddChannelToCategory,
  useRemoveChannelFromCategory,
  useMoveChannelInCategory,
} from "@/hooks/useChannelCategories";
import { useFavoriteChannelIds, useToggleChannelFavorite } from "@/hooks/useChannelFavorites";
import { UnreadBadge } from "@/components/ui/UnreadBadge";

interface CategoryManagerProps {
  workspaceId: string;
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  unreadCounts?: Record<string, number>;
}

function SortableChannel({
  channel,
  isSelected,
  isFavorite,
  unreadCount,
  onSelect,
  onToggleFavorite,
}: {
  channel: Channel;
  isSelected: boolean;
  isFavorite: boolean;
  unreadCount: number;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg transition-colors",
        isDragging && "opacity-50",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-secondary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <button onClick={onSelect} className="flex-1 flex items-center gap-2 text-left min-w-0">
        {channel.is_private ? (
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium truncate flex-1 min-w-0">{channel.name}</span>
        {unreadCount > 0 && <UnreadBadge count={unreadCount} size="sm" className="shrink-0" />}
      </button>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 rounded transition-opacity",
          isFavorite ? "opacity-100 text-warning" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={onToggleFavorite}
      >
        <Star className={cn("h-3 w-3", isFavorite && "fill-current")} />
      </Button>
    </div>
  );
}

function SortableCategory({
  category,
  channels,
  selectedChannel,
  favoriteIds,
  unreadCounts,
  onSelectChannel,
  onToggleFavorite,
  onEdit,
  onDelete,
  onRemoveChannel,
}: {
  category: ChannelCategory;
  channels: Channel[];
  selectedChannel: Channel | null;
  favoriteIds: string[];
  unreadCounts: Record<string, number>;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (e: React.MouseEvent, channelId: string, isFavorite: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveChannel: (channelId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoryChannels = category.channels
    .map((id) => channels.find((c) => c.id === id))
    .filter(Boolean) as Channel[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("space-y-1", isDragging && "opacity-50")}
    >
      <div className="group flex items-center gap-1 px-2 py-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 flex-1 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {category.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({categoryChannels.length})
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-4 space-y-1 overflow-hidden"
          >
            <SortableContext
              items={categoryChannels.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categoryChannels.map((channel) => (
                <div key={channel.id} className="relative group/channel">
                  <SortableChannel
                    channel={channel}
                    isSelected={selectedChannel?.id === channel.id}
                    isFavorite={favoriteIds.includes(channel.id)}
                    unreadCount={unreadCounts[channel.id] || 0}
                    onSelect={() => onSelectChannel(channel)}
                    onToggleFavorite={(e) =>
                      onToggleFavorite(e, channel.id, favoriteIds.includes(channel.id))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/channel:opacity-100 transition-opacity"
                    onClick={() => onRemoveChannel(channel.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </SortableContext>

            {categoryChannels.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 px-2">
                Arraste canais para esta categoria
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CategoryManager({
  workspaceId,
  channels,
  selectedChannel,
  onSelectChannel,
  unreadCounts = {},
}: CategoryManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChannelCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: categories = [] } = useChannelCategories(workspaceId);
  const favoriteIds = useFavoriteChannelIds(workspaceId);
  const toggleFavorite = useToggleChannelFavorite();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const removeChannelFromCategory = useRemoveChannelFromCategory();
  const addChannelToCategory = useAddChannelToCategory();
  const moveChannelInCategory = useMoveChannelInCategory();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Channels not in any category
  const categorizedChannelIds = categories.flatMap((c) => c.channels);
  const uncategorizedChannels = channels.filter(
    (c) => !categorizedChannelIds.includes(c.id) && !favoriteIds.includes(c.id)
  );
  const favoriteChannels = channels.filter((c) => favoriteIds.includes(c.id));

  const handleToggleFavorite = (
    e: React.MouseEvent,
    channelId: string,
    isFavorite: boolean
  ) => {
    e.stopPropagation();
    toggleFavorite.mutate({ channelId, isFavorite });
  };

  const handleCreateCategory = () => {
    if (!categoryName.trim()) return;
    createCategory.mutate(
      { workspaceId, name: categoryName.trim() },
      {
        onSuccess: () => {
          setCategoryName("");
          setShowCreateDialog(false);
        },
      }
    );
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !categoryName.trim()) return;
    updateCategory.mutate(
      {
        categoryId: editingCategory.id,
        name: categoryName.trim(),
        workspaceId,
      },
      {
        onSuccess: () => {
          setCategoryName("");
          setEditingCategory(null);
        },
      }
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Check if dragging a category
    const activeCategory = categories.find((c) => c.id === active.id);
    const overCategory = categories.find((c) => c.id === over.id);

    if (activeCategory && overCategory) {
      // Reorder categories
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      reorderCategories.mutate({
        workspaceId,
        categoryIds: newOrder.map((c) => c.id),
      });
      return;
    }

    // Check if dragging a channel within a category
    const activeChannel = channels.find((c) => c.id === active.id);
    if (activeChannel) {
      // Find which category contains this channel
      const sourceCategory = categories.find((cat) =>
        cat.channels.includes(activeChannel.id)
      );

      // Check if dropping on a category
      const targetCategory = categories.find((c) => c.id === over.id);
      if (targetCategory && sourceCategory?.id !== targetCategory.id) {
        // Move channel to new category
        if (sourceCategory) {
          removeChannelFromCategory.mutate({
            categoryId: sourceCategory.id,
            channelId: activeChannel.id,
            workspaceId,
          });
        }
        addChannelToCategory.mutate({
          categoryId: targetCategory.id,
          channelId: activeChannel.id,
          workspaceId,
        });
        return;
      }

      // Check if dropping on another channel
      const overChannel = channels.find((c) => c.id === over.id);
      if (overChannel && sourceCategory) {
        const channelIds = [...sourceCategory.channels];
        const oldIndex = channelIds.indexOf(activeChannel.id);
        const newIndex = channelIds.indexOf(overChannel.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(channelIds, oldIndex, newIndex);
          moveChannelInCategory.mutate({
            categoryId: sourceCategory.id,
            channelIds: newOrder,
            workspaceId,
          });
        }
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeChannel = channels.find((c) => c.id === active.id);
    if (!activeChannel) return;

    // If dragging over a category, allow dropping
    const targetCategory = categories.find((c) => c.id === over.id);
    if (targetCategory) {
      // Highlight category (handled by CSS)
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Category Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl gap-2"
        onClick={() => setShowCreateDialog(true)}
      >
        <FolderPlus className="h-4 w-4" />
        Nova Categoria
      </Button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        {/* Favorites */}
        {favoriteChannels.length > 0 && (
          <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1">
            <Star className="h-3 w-3 text-warning fill-current" />
              Favoritos
            </p>
            {favoriteChannels.map((channel) => (
              <SortableChannel
                key={channel.id}
                channel={channel}
                isSelected={selectedChannel?.id === channel.id}
                isFavorite={true}
                unreadCount={unreadCounts[channel.id] || 0}
                onSelect={() => onSelectChannel(channel)}
                onToggleFavorite={(e) =>
                  handleToggleFavorite(e, channel.id, true)
                }
              />
            ))}
          </div>
        )}

        {/* Categories */}
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableCategory
              key={category.id}
              category={category}
              channels={channels}
              selectedChannel={selectedChannel}
              favoriteIds={favoriteIds}
              unreadCounts={unreadCounts}
              onSelectChannel={onSelectChannel}
              onToggleFavorite={handleToggleFavorite}
              onEdit={() => {
                setEditingCategory(category);
                setCategoryName(category.name);
              }}
              onDelete={() => {
                deleteCategory.mutate({ categoryId: category.id, workspaceId });
              }}
              onRemoveChannel={(channelId) => {
                removeChannelFromCategory.mutate({
                  categoryId: category.id,
                  channelId,
                  workspaceId,
                });
              }}
            />
          ))}
        </SortableContext>

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Canais
            </p>
            {uncategorizedChannels.map((channel) => (
              <div
                key={channel.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("channelId", channel.id);
                }}
                className="cursor-grab"
              >
                <SortableChannel
                  channel={channel}
                  isSelected={selectedChannel?.id === channel.id}
                  isFavorite={false}
                  unreadCount={unreadCounts[channel.id] || 0}
                  onSelect={() => onSelectChannel(channel)}
                  onToggleFavorite={(e) =>
                    handleToggleFavorite(e, channel.id, false)
                  }
                />
              </div>
            ))}
          </div>
        )}

        <DragOverlay>
          {activeId && (
            <div className="bg-card shadow-lg rounded-lg p-2 opacity-90">
              {categories.find((c) => c.id === activeId)?.name ||
                channels.find((c) => c.id === activeId)?.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da categoria"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={createCategory.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Categoria</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da categoria"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpdateCategory()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory} disabled={updateCategory.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
