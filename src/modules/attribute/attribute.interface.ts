import { AttributeType } from '@prisma/client';

export interface AttributeResponse {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
}
