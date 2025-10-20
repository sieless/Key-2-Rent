import { CollectionReference, DocumentData, query, where, limit, getDocs } from 'firebase/firestore';

export async function fetchSingleDocument<T>(params: {
  collectionRef: CollectionReference<DocumentData>;
  field: string;
  value: string;
}): Promise<{ data: T | null; id: string | null }> {
  const { collectionRef, field, value } = params;
  const q = query(collectionRef, where(field, '==', value), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { data: null, id: null };
  }

  const doc = snapshot.docs[0];
  return { data: doc.data() as T, id: doc.id };
}
