import {
  db,
  auth,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  deleteDoc,
  writeBatch,
  query,
  where,
  FirebaseUser
} from './firebase';
import { FinanceData, Transaction, Debt, Loan, CreditCard, Household, HouseholdMember, UserProfile, AuthorColor } from '../types';

export const cleanObject = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanObject(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
};

export const generateInviteCode = (seed?: string): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CASAL-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- User Profile & Household Management ---

export const getOrCreateUserProfile = async (user: FirebaseUser): Promise<{ profile: UserProfile; household: Household }> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  let profile: UserProfile;
  let householdId: string;

  if (userSnap.exists()) {
    const data = userSnap.data() as Partial<UserProfile>;
    householdId = data.householdId || user.uid;
    const resolvedName = data.displayName || user.displayName || user.email?.split('@')[0] || 'Usuário';
    const resolvedColor = (data.preferredColor as AuthorColor) || 'blue';
    profile = {
      uid: user.uid,
      email: user.email || '',
      displayName: resolvedName,
      photoURL: data.photoURL || user.photoURL || undefined,
      householdId,
      preferredColor: resolvedColor,
      partnerName: data.partnerName,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    // Ensure document is up to date without erasing custom displayName
    await setDoc(userRef, cleanObject(profile), { merge: true });
  } else {
    householdId = user.uid;
    profile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
      photoURL: user.photoURL || undefined,
      householdId,
      preferredColor: 'blue',
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, cleanObject(profile));
  }

  // Ensure household exists
  let household = await getHousehold(householdId);
  if (!household) {
    // Check if user is already in another household by email
    const existingByEmail = user.email ? await findHouseholdByEmail(user.email) : null;
    if (existingByEmail) {
      household = existingByEmail;
      profile.householdId = household.id;
      await setDoc(userRef, { householdId: household.id }, { merge: true });
      await joinHousehold(household.id, user, (profile.preferredColor as AuthorColor) || 'blue');
    } else {
      household = await initializeHousehold(user, householdId, profile.displayName, (profile.preferredColor as AuthorColor) || 'blue');
    }
  } else {
    // Make sure user is in members list and user profile is properly represented
    let needsUpdate = false;
    if (!household.members.includes(user.uid)) {
      household.members.push(user.uid);
      needsUpdate = true;
    }
    if (user.email && !household.memberEmails.includes(user.email.toLowerCase())) {
      household.memberEmails.push(user.email.toLowerCase());
      needsUpdate = true;
    }
    const memberProfiles = household.memberProfiles || {};
    const existingMember = memberProfiles[user.uid];
    const memberName = profile.displayName || existingMember?.name || 'Usuário';
    const memberColor = (profile.preferredColor as AuthorColor) || existingMember?.color || 'blue';

    if (!existingMember || existingMember.name !== memberName || existingMember.color !== memberColor) {
      memberProfiles[user.uid] = {
        uid: user.uid,
        name: memberName,
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        color: memberColor,
        role: household.ownerUid === user.uid ? 'owner' : 'member'
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await setDoc(doc(db, 'households', householdId), cleanObject({
        members: household.members,
        memberEmails: household.memberEmails,
        memberProfiles,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    }
  }

  // Migrate legacy data if exists in users/{uid}
  await checkAndMigrateLegacyData(user.uid, household.id);

  return { profile, household };
};

export const initializeHousehold = async (
  user: FirebaseUser, 
  householdId: string = user.uid,
  customName?: string,
  customColor?: AuthorColor
): Promise<Household> => {
  const code = generateInviteCode(user.uid);
  const now = new Date().toISOString();
  const householdData: Household = {
    id: householdId,
    name: 'Finanças do Casal',
    ownerUid: user.uid,
    members: [user.uid],
    memberEmails: user.email ? [user.email.toLowerCase()] : [],
    inviteCode: code,
    memberProfiles: {
      [user.uid]: {
        uid: user.uid,
        name: customName || user.displayName || 'Jorge',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        color: customColor || 'blue',
        role: 'owner'
      }
    },
    createdAt: now,
    updatedAt: now
  };

  const hRef = doc(db, 'households', householdId);
  await setDoc(hRef, cleanObject(householdData), { merge: true });
  return householdData;
};

export const getHousehold = async (householdId: string): Promise<Household | null> => {
  try {
    const ref = doc(db, 'households', householdId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as Household;
    }
  } catch (e) {
    console.error('Error fetching household:', e);
  }
  return null;
};

export const findHouseholdByInviteCode = async (inviteCode: string): Promise<Household | null> => {
  try {
    const codeClean = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'households'), where('inviteCode', '==', codeClean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Household;
    }
  } catch (e) {
    console.error('Error finding household by code:', e);
  }
  return null;
};

export const findHouseholdByEmail = async (email: string): Promise<Household | null> => {
  try {
    const emailClean = email.trim().toLowerCase();
    const q = query(collection(db, 'households'), where('memberEmails', 'array-contains', emailClean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Household;
    }
  } catch (e) {
    console.error('Error finding household by email:', e);
  }
  return null;
};

export const joinHousehold = async (householdId: string, user: FirebaseUser, defaultColor: AuthorColor = 'pink'): Promise<Household> => {
  const hRef = doc(db, 'households', householdId);
  const snap = await getDoc(hRef);
  if (!snap.exists()) {
    throw new Error('Espaço compartilhado não encontrado.');
  }

  const household = snap.data() as Household;
  const members = Array.from(new Set([...household.members, user.uid]));
  const memberEmails = user.email ? Array.from(new Set([...household.memberEmails, user.email.toLowerCase()])) : household.memberEmails;
  
  const memberProfiles = household.memberProfiles || {};
  memberProfiles[user.uid] = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Companheira',
    email: user.email || undefined,
    photoURL: user.photoURL || undefined,
    color: defaultColor,
    role: household.ownerUid === user.uid ? 'owner' : 'member'
  };

  const updatedData = {
    members,
    memberEmails,
    memberProfiles,
    updatedAt: new Date().toISOString()
  };

  await setDoc(hRef, cleanObject(updatedData), { merge: true });

  // Update user's householdId
  await setDoc(doc(db, 'users', user.uid), {
    householdId,
    preferredColor: defaultColor,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return {
    ...household,
    ...updatedData
  };
};

export const invitePartnerByEmail = async (householdId: string, partnerEmail: string, partnerName?: string): Promise<void> => {
  const emailClean = partnerEmail.trim().toLowerCase();
  const hRef = doc(db, 'households', householdId);
  const snap = await getDoc(hRef);
  if (!snap.exists()) throw new Error('Espaço não encontrado.');

  const household = snap.data() as Household;
  const memberEmails = Array.from(new Set([...household.memberEmails, emailClean]));
  
  await setDoc(hRef, {
    memberEmails,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // If the user already exists, let's automatically join them to this household
  try {
    const q = query(collection(db, 'users'), where('email', '==', emailClean));
    const userSnap = await getDocs(q);
    if (!userSnap.empty) {
      const partnerData = userSnap.docs[0].data();
      const partnerUid = userSnap.docs[0].id;
      
      // Update their householdId in their user profile
      await setDoc(doc(db, 'users', partnerUid), { 
        householdId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Add them to the household members array
      const members = Array.from(new Set([...household.members, partnerUid]));
      const memberProfiles = household.memberProfiles || {};
      if (!memberProfiles[partnerUid]) {
        memberProfiles[partnerUid] = {
          uid: partnerUid,
          name: partnerData.displayName || partnerName || emailClean.split('@')[0],
          email: emailClean,
          photoURL: partnerData.photoURL || undefined,
          color: 'pink',
          role: 'member'
        };
      }
      
      await setDoc(hRef, {
        members,
        memberProfiles,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e) {
    console.error('Error auto-joining existing user:', e);
  }
};

export const updateUserMemberProfile = async (householdId: string, uid: string, updates: Partial<HouseholdMember>): Promise<void> => {
  try {
    // 1. Always update user profile document
    await setDoc(doc(db, 'users', uid), cleanObject({
      ...(updates.name ? { displayName: updates.name } : {}),
      ...(updates.color ? { preferredColor: updates.color } : {}),
      updatedAt: new Date().toISOString()
    }), { merge: true });

    // 2. Update household document if it exists
    const hRef = doc(db, 'households', householdId);
    const snap = await getDoc(hRef);
    if (snap.exists()) {
      const household = snap.data() as Household;
      const memberProfiles = household.memberProfiles || {};
      const current = memberProfiles[uid] || { 
        uid, 
        name: updates.name || 'Usuário',
        color: (updates.color as AuthorColor) || 'blue',
        role: household.ownerUid === uid ? 'owner' : 'member' 
      };
      memberProfiles[uid] = {
        ...current,
        ...updates,
        name: updates.name || current.name
      };
      await setDoc(hRef, cleanObject({ memberProfiles, updatedAt: new Date().toISOString() }), { merge: true });
    }
  } catch (error) {
    console.error('Error updating user member profile:', error);
    throw error;
  }
};

export const updateAuthorNameInAllTransactions = async (
  householdId: string,
  oldNames: string[],
  newName: string,
  newColor?: AuthorColor
): Promise<number> => {
  try {
    const normalizedOldNames = oldNames.map(n => n.trim().toLowerCase());
    let count = 0;
    const batch = writeBatch(db);

    // 1. Update in active household collection
    const txRef = collection(db, 'households', householdId, 'transactions');
    const snap = await getDocs(txRef);
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const currentName = (data.createdByName || 'Jorge').trim().toLowerCase();
      if (normalizedOldNames.includes(currentName) || !data.createdByName) {
        batch.update(docSnap.ref, cleanObject({
          createdByName: newName,
          ...(newColor ? { createdByColor: newColor } : {}),
          updatedAt: new Date().toISOString()
        }));
        count++;
      }
    });

    // 2. Also check and clean up any legacy user transactions to avoid resurrection
    try {
      const legacyTxRef = collection(db, 'users', householdId, 'transactions');
      const legacySnap = await getDocs(legacyTxRef);
      legacySnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
    } catch {
      // ignore if legacy collection does not exist
    }

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    console.error('Error unifying transaction authors:', error);
    throw error;
  }
};

// Check and migrate legacy data from users/{uid} to households/{householdId} if needed, and delete legacy docs
export const checkAndMigrateLegacyData = async (userId: string, householdId: string) => {
  try {
    const legacyTxSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
    if (!legacyTxSnap.empty) {
      const batch = writeBatch(db);
      for (const docSnap of legacyTxSnap.docs) {
        const data = docSnap.data();
        const destRef = doc(db, 'households', householdId, 'transactions', docSnap.id);
        const destSnap = await getDoc(destRef);
        // Only copy if destination does not exist yet to prevent overwriting updated names
        if (!destSnap.exists()) {
          batch.set(destRef, cleanObject({
            ...data,
            householdId,
            createdByUid: data.createdByUid || userId,
            createdByName: data.createdByName || 'Jorge',
            createdByColor: data.createdByColor || 'blue'
          }));
        }
        // Delete legacy document so it is never re-processed on next reload
        batch.delete(docSnap.ref);
      }

      const legacyDebts = await getDocs(collection(db, 'users', userId, 'debts'));
      for (const dSnap of legacyDebts.docs) {
        const dRef = doc(db, 'households', householdId, 'debts', dSnap.id);
        const dDest = await getDoc(dRef);
        if (!dDest.exists()) {
          batch.set(dRef, cleanObject(dSnap.data()));
        }
        batch.delete(dSnap.ref);
      }

      const legacyLoans = await getDocs(collection(db, 'users', userId, 'loans'));
      for (const lSnap of legacyLoans.docs) {
        const lRef = doc(db, 'households', householdId, 'loans', lSnap.id);
        const lDest = await getDoc(lRef);
        if (!lDest.exists()) {
          batch.set(lRef, cleanObject(lSnap.data()));
        }
        batch.delete(lSnap.ref);
      }

      const legacySettings = await getDoc(doc(db, 'users', userId, 'settings', 'general'));
      if (legacySettings.exists()) {
        const sRef = doc(db, 'households', householdId, 'settings', 'general');
        const sDest = await getDoc(sRef);
        if (!sDest.exists()) {
          batch.set(sRef, cleanObject(legacySettings.data()));
        }
        batch.delete(legacySettings.ref);
      }

      await batch.commit();
    }
  } catch (e) {
    console.error('Error migrating legacy user data:', e);
  }
};

// --- CRUD Operations for Household / Space ---

export const saveUserSettings = async (householdId: string, categories: string[], debtCategories: string[], benefitMembers?: string[]) => {
  try {
    const settingsRef = doc(db, 'households', householdId, 'settings', 'general');
    await setDoc(settingsRef, cleanObject({
      categories,
      debtCategories,
      benefitMembers: benefitMembers || ['Jorge', 'GO'],
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (error) {
    console.error('Error saving household settings:', error);
    throw error;
  }
};

export const saveTransaction = async (householdId: string, transaction: Transaction) => {
  const ref = doc(db, 'households', householdId, 'transactions', transaction.id);
  await setDoc(ref, cleanObject({
    ...transaction,
    householdId,
    updatedAt: new Date().toISOString()
  }));
};

export const deleteTransactionFromDb = async (householdId: string, transactionId: string) => {
  const ref = doc(db, 'households', householdId, 'transactions', transactionId);
  await deleteDoc(ref);
};

export const saveDebt = async (householdId: string, debt: Debt) => {
  const ref = doc(db, 'households', householdId, 'debts', debt.id);
  await setDoc(ref, cleanObject({
    ...debt,
    householdId,
    updatedAt: new Date().toISOString()
  }));
};

export const deleteDebtFromDb = async (householdId: string, debtId: string) => {
  const ref = doc(db, 'households', householdId, 'debts', debtId);
  await deleteDoc(ref);
};

export const saveLoan = async (householdId: string, loan: Loan) => {
  const ref = doc(db, 'households', householdId, 'loans', loan.id);
  await setDoc(ref, cleanObject({
    ...loan,
    householdId,
    updatedAt: new Date().toISOString()
  }));
};

export const deleteLoanFromDb = async (householdId: string, loanId: string) => {
  const ref = doc(db, 'households', householdId, 'loans', loanId);
  await deleteDoc(ref);
};

export const saveCreditCard = async (householdId: string, card: CreditCard) => {
  const ref = doc(db, 'households', householdId, 'creditCards', card.id);
  await setDoc(ref, cleanObject({
    ...card,
    householdId,
    updatedAt: new Date().toISOString()
  }));
};

export const deleteCreditCardFromDb = async (householdId: string, cardId: string) => {
  const ref = doc(db, 'households', householdId, 'creditCards', cardId);
  await deleteDoc(ref);
};

export const saveCreditCardsBatch = async (householdId: string, cards: CreditCard[]) => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const c of cards) {
    const ref = doc(db, 'households', householdId, 'creditCards', c.id);
    batch.set(ref, cleanObject({
      ...c,
      householdId,
      updatedAt: now
    }));
  }
  await batch.commit();
};

export const migrateLocalDataToFirestore = async (householdId: string, localData: FinanceData, currentUser?: FirebaseUser) => {
  const now = new Date().toISOString();
  type BatchOp = { ref: any; data: any; merge?: boolean };
  const operations: BatchOp[] = [];

  // Settings
  const settingsRef = doc(db, 'households', householdId, 'settings', 'general');
  operations.push({
    ref: settingsRef,
    data: cleanObject({
      categories: localData.categories || ['Geral', 'Alimentação', 'Lazer', 'Transporte', 'Saúde', 'Educação'],
      debtCategories: localData.debtCategories || ['Geral', 'Casa', 'Veículo', 'Pessoal'],
      benefitMembers: localData.benefitMembers || ['Jorge', 'GO'],
      updatedAt: now
    }),
    merge: true
  });

  // Transactions
  if (localData.transactions && Array.isArray(localData.transactions)) {
    for (const t of localData.transactions) {
      const id = t.id || crypto.randomUUID();
      const tRef = doc(db, 'households', householdId, 'transactions', id);
      operations.push({
        ref: tRef,
        data: cleanObject({
          ...t,
          id,
          householdId,
          createdByUid: t.createdByUid || currentUser?.uid,
          createdByName: t.createdByName || currentUser?.displayName || 'Jorge',
          createdByColor: t.createdByColor || 'blue',
          updatedAt: now
        })
      });
    }
  }

  // Debts
  if (localData.debts && Array.isArray(localData.debts)) {
    for (const d of localData.debts) {
      const id = d.id || crypto.randomUUID();
      const dRef = doc(db, 'households', householdId, 'debts', id);
      operations.push({
        ref: dRef,
        data: cleanObject({
          ...d,
          id,
          householdId,
          updatedAt: now
        })
      });
    }
  }

  // Loans
  if (localData.loans && Array.isArray(localData.loans)) {
    for (const l of localData.loans) {
      const id = l.id || crypto.randomUUID();
      const lRef = doc(db, 'households', householdId, 'loans', id);
      operations.push({
        ref: lRef,
        data: cleanObject({
          ...l,
          id,
          householdId,
          updatedAt: now
        })
      });
    }
  }

  // Credit Cards
  if (localData.creditCards && Array.isArray(localData.creditCards)) {
    for (const c of localData.creditCards) {
      const id = c.id || crypto.randomUUID();
      const cRef = doc(db, 'households', householdId, 'creditCards', id);
      operations.push({
        ref: cRef,
        data: cleanObject({
          ...c,
          id,
          householdId,
          updatedAt: now
        })
      });
    }
  }

  // Commit operations in chunks of max 400 to prevent exceeding Firestore's 500-operation limit
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.merge) {
        batch.set(op.ref, op.data, { merge: true });
      } else {
        batch.set(op.ref, op.data);
      }
    }
    await batch.commit();
  }
};


