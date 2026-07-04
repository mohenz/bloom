import { db, formatTimestamp } from './firebase-store.js';
import admin from 'firebase-admin';

// --- Story Groups Store ---
export async function listStoryGroupsByUserId(userId) {
  try {
    const snapshot = await db.collection('story_groups')
      .where('user_id', '==', userId)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    }));
  } catch (error) {
    console.error('Failed to list story groups:', error);
    return [];
  }
}

export async function createStoryGroup(record) {
  try {
    const docData = {
      ...record,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('story_groups').add(docData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    };
  } catch (error) {
    console.error('Failed to create story group:', error);
    return null;
  }
}

export async function updateStoryGroup(userId, groupId, record) {
  try {
    const docRef = db.collection('story_groups').doc(groupId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return null;
    }
    const updateData = {
      ...record,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      created_at: formatTimestamp(updatedDoc.data().created_at),
      updated_at: formatTimestamp(updatedDoc.data().updated_at),
    };
  } catch (error) {
    console.error('Failed to update story group:', error);
    return null;
  }
}

export async function deleteStoryGroup(userId, groupId) {
  try {
    const docRef = db.collection('story_groups').doc(groupId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return null;
    }
    const deletedData = doc.data();
    await docRef.delete();
    return {
      id: doc.id,
      ...deletedData,
      created_at: formatTimestamp(deletedData.created_at),
      updated_at: formatTimestamp(deletedData.updated_at),
    };
  } catch (error) {
    console.error('Failed to delete story group:', error);
    return null;
  }
}

// --- Story Documents Store ---
export async function listStoryDocumentsByUserId(userId) {
  try {
    const snapshot = await db.collection('story_documents')
      .where('user_id', '==', userId)
      .orderBy('sort_order', 'asc')
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    }));
  } catch (error) {
    console.error('Failed to list story documents:', error);
    return [];
  }
}

export async function createStoryDocument(record) {
  try {
    const docData = {
      ...record,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('story_documents').add(docData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    };
  } catch (error) {
    console.error('Failed to create story document:', error);
    return null;
  }
}

export async function updateStoryDocument(userId, docId, record) {
  try {
    const docRef = db.collection('story_documents').doc(docId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return null;
    }
    const updateData = {
      ...record,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      created_at: formatTimestamp(updatedDoc.data().created_at),
      updated_at: formatTimestamp(updatedDoc.data().updated_at),
    };
  } catch (error) {
    console.error('Failed to update story document:', error);
    return null;
  }
}

export async function deleteStoryDocument(userId, docId) {
  try {
    const docRef = db.collection('story_documents').doc(docId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return null;
    }
    const deletedData = doc.data();
    await docRef.delete();
    return {
      id: doc.id,
      ...deletedData,
      created_at: formatTimestamp(deletedData.created_at),
      updated_at: formatTimestamp(deletedData.updated_at),
    };
  } catch (error) {
    console.error('Failed to delete story document:', error);
    return null;
  }
}

// --- Story References Store ---
export async function listStoryReferencesByUserId(userId) {
  try {
    const snapshot = await db.collection('story_references')
      .where('user_id', '==', userId)
      .get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to list story references:', error);
    return [];
  }
}

export async function createStoryReference(record) {
  try {
    const docRef = await db.collection('story_references').add(record);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Failed to create story reference:', error);
    return null;
  }
}

export async function deleteStoryReference(userId, refId) {
  try {
    const docRef = db.collection('story_references').doc(refId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().user_id !== userId) {
      return null;
    }
    const deletedData = doc.data();
    await docRef.delete();
    return {
      id: doc.id,
      ...deletedData,
    };
  } catch (error) {
    console.error('Failed to delete story reference:', error);
    return null;
  }
}

export async function deleteStoryReferencesByDocumentId(userId, docId) {
  try {
    const batch = db.batch();
    
    // Query references where the document is source or target
    const sourceSnapshot = await db.collection('story_references')
      .where('user_id', '==', userId)
      .where('source_id', '==', docId)
      .get();
      
    const targetSnapshot = await db.collection('story_references')
      .where('user_id', '==', userId)
      .where('target_id', '==', docId)
      .get();
      
    const deletedRefs = [];
    
    sourceSnapshot.docs.forEach(doc => {
      deletedRefs.push({ id: doc.id, ...doc.data() });
      batch.delete(doc.ref);
    });
    
    targetSnapshot.docs.forEach(doc => {
      if (!deletedRefs.some(r => r.id === doc.id)) {
        deletedRefs.push({ id: doc.id, ...doc.data() });
        batch.delete(doc.ref);
      }
    });
    
    await batch.commit();
    return deletedRefs;
  } catch (error) {
    console.error('Failed to delete story references by document id:', error);
    return [];
  }
}

