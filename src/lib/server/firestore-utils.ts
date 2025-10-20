import {
  QueryConstraint,
  query,
  where,
  orderBy,
  limit as limitConstraint,
  getDocs,
} from 'firebase/firestore';

export async function fetchSingleDocument<T>(params: {
  collectionRef: any;
  field: string;
  value: string;
}): Promise<{ data: T | null; id: string | null }> {
  const { collectionRef, field, value } = params;
  const q = query(collectionRef, where(field, '==', value), limitConstraint(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { data: null, id: null };
  }

  const doc = snapshot.docs[0];
  return { data: doc.data() as T, id: doc.id };
}
