import type { LibraryItem } from './kit';
import { CONTRACTS } from './contracts';
import { PRIVACY } from './privacy';
import { FINANCE } from './finance';

/** Every library document. Batches are added here; ids must be unique across the library and the quick templates. */
export const LIBRARY: LibraryItem[] = [...CONTRACTS, ...PRIVACY, ...FINANCE];

export const libraryById = (id: string) => LIBRARY.find((i) => i.id === id);
