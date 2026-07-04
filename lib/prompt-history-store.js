import { db, formatTimestamp } from './firebase-store.js';
import admin from 'firebase-admin';

export async function listPromptHistoriesByUserId(userId) {
  try {
    const snapshot = await db.collection('prompt_histories')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    }));
  } catch (error) {
    console.error('Failed to list prompt histories:', error);
    return [];
  }
}

export async function createPromptHistory(record) {
  try {
    const docData = {
      ...record,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('prompt_histories').add(docData);
    const doc = await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
      created_at: formatTimestamp(doc.data().created_at),
      updated_at: formatTimestamp(doc.data().updated_at),
    };
  } catch (error) {
    console.error('Failed to create prompt history:', error);
    return null;
  }
}

export async function updatePromptHistory(userId, historyId, record) {
  try {
    const docRef = db.collection('prompt_histories').doc(historyId);
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
    console.error('Failed to update prompt history:', error);
    return null;
  }
}

export async function deletePromptHistory(userId, historyId) {
  try {
    const docRef = db.collection('prompt_histories').doc(historyId);
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
    console.error('Failed to delete prompt history:', error);
    return null;
  }
}












