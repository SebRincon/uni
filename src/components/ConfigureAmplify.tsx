"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    // Amplify.configure is idempotent, so it's safe to call on every render.
    // The library handles preventing re-configuration internally.
    Amplify.configure(outputs, { ssr: true });
  }, []);

  return null;
}