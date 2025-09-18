"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

// Configure Amplify only once
let isConfigured = false;

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    if (!isConfigured) {
      Amplify.configure(outputs, { ssr: true });
      isConfigured = true;
    }
  }, []);

  return null;
}