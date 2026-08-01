export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  childrenCount?: number;
  productCount?: number;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}
