import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "./config";

export const AutoSignIn = () => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUser(null);
        setAdmin(false);
        signInAnonymously(auth);
        return;
      }
      if (!user.displayName) {
        setUser(null);
        setAdmin(false);
        return;
      }
      console.debug(`Signed-in: name=${user.displayName}, uid=${user.uid}`);
      setUser(user);
      getDoc(doc(db, "users", user.uid)).then((docSnap) => {
        const isAdmin = docSnap.exists() && !!docSnap.data().admin;
        if (isAdmin) console.debug("User is admin");
        setAdmin(isAdmin);
      });
    });

    return () => unsubscribe();
  }, []);

  return { user, admin };
};
