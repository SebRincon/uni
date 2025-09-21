import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { Dialog, DialogContent, DialogTitle, InputAdornment, TextField } from "@mui/material";
import * as yup from "yup";
import Image from "next/image";
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';

import { SignUpDialogProps } from "@/types/DialogProps";
import CircularLoading from "../misc/CircularLoading";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";

export default function SignUpDialog({ open, handleSignUpClose }: SignUpDialogProps) {
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });
    const [isConfirmationStep, setIsConfirmationStep] = useState(false);
    const [tempCredentials, setTempCredentials] = useState({ username: "", password: "" });

    const router = useRouter();

    const validationSchema = yup.object({
        username: yup
            .string()
            .min(3, "Username should be of minimum 3 characters length.")
            .max(20, "Username should be of maximum 20 characters length.")
            .matches(/^[a-zA-Z0-9_]{1,14}[a-zA-Z0-9]$/, "Username is invalid")
            .required("Username is required."),
        email: yup
            .string()
            .email("Enter a valid email")
            .required("Email is required."),
        password: yup
            .string()
            .min(8, "Password should be of minimum 8 characters length.")
            .max(100, "Password should be of maximum 100 characters length.")
            .required("Password is required."),
        name: yup.string().max(50, "Name should be of maximum 50 characters length."),
    });

    const confirmationSchema = yup.object({
        confirmationCode: yup
            .string()
            .length(6, "Confirmation code must be 6 digits")
            .required("Confirmation code is required."),
    });

    const formik = useFormik({
        initialValues: {
            username: "",
            email: "",
            password: "",
            name: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                const { isSignUpComplete, nextStep } = await signUp({
                    username: values.email, // Use email as username for Cognito
                    password: values.password,
                    options: {
                        userAttributes: {
                            email: values.email,
                            preferred_username: values.username, // Store the display username
                            name: values.name,
                        },
                    },
                });
                
                if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                    // Store credentials for auto-signin after confirmation
                    setTempCredentials({ username: values.email, password: values.password });
                    setIsConfirmationStep(true);
                    setSnackbar({ message: "Please check your email for the confirmation code", severity: "info", open: true });
                } else if (isSignUpComplete) {
                    // If no confirmation needed, sign in directly
                    await signIn({ username: values.email, password: values.password });
                    resetForm();
                    handleSignUpClose();
                    router.push("/explore");
                }
            } catch (error) {
                console.error('Error signing up:', error);
                setSnackbar({ message: (error as Error).message, severity: "error", open: true });
            }
        },
    });

    const confirmFormik = useFormik({
        initialValues: {
            confirmationCode: "",
        },
        validationSchema: confirmationSchema,
        onSubmit: async (values) => {
            try {
                await confirmSignUp({
                    username: tempCredentials.username,
                    confirmationCode: values.confirmationCode,
                });
                
                // Auto sign in after successful confirmation
                await signIn({ 
                    username: tempCredentials.username, 
                    password: tempCredentials.password 
                });
                
                formik.resetForm();
                confirmFormik.resetForm();
                setIsConfirmationStep(false);
                handleSignUpClose();
                router.push("/explore");
            } catch (error) {
                console.error('Error confirming sign up:', error);
                setSnackbar({ message: (error as Error).message, severity: "error", open: true });
            }
        },
    });

    return (
        <Dialog className="dialog" open={open} onClose={handleSignUpClose}>
            <Image className="dialog-icon" src="/assets/unicorn-head-purple.png" alt="" width={40} height={40} />
            <DialogTitle className="title">
                {isConfirmationStep ? "Confirm your account" : "Create your account"}
            </DialogTitle>
            {!isConfirmationStep ? (
                <form className="dialog-form" onSubmit={formik.handleSubmit}>
                    <DialogContent>
                        <div className="input-group">
                            <div className="input">
                                <div className="info">Your login information</div>
                                <TextField
                                    required
                                    fullWidth
                                    name="username"
                                    label="Username"
                                    placeholder="username"
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">@</InputAdornment>,
                                    }}
                                    value={formik.values.username}
                                    onChange={formik.handleChange}
                                    error={formik.touched.username && Boolean(formik.errors.username)}
                                    helperText={formik.touched.username && formik.errors.username}
                                    autoFocus
                                />
                            </div>
                            <div className="input">
                                <TextField
                                    required
                                    fullWidth
                                    name="email"
                                    label="Email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    error={formik.touched.email && Boolean(formik.errors.email)}
                                    helperText={formik.touched.email && formik.errors.email}
                                />
                            </div>
                            <div className="input">
                                <TextField
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    error={formik.touched.password && Boolean(formik.errors.password)}
                                    helperText={formik.touched.password && formik.errors.password}
                                />
                            </div>
                            <div className="input">
                                <div className="info">Your public name</div>
                                <TextField
                                    fullWidth
                                    name="name"
                                    label="Name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                />
                            </div>
                        </div>
                    </DialogContent>
                    {formik.isSubmitting ? (
                        <CircularLoading />
                    ) : (
                        <button
                            className={`btn btn-dark ${formik.isValid ? "" : "disabled"}`}
                            type="submit"
                            disabled={!formik.isValid}
                        >
                            Create
                        </button>
                    )}
                </form>
            ) : (
                <form className="dialog-form" onSubmit={confirmFormik.handleSubmit}>
                    <DialogContent>
                        <div className="input-group">
                            <div className="input">
                                <div className="info">Enter the 6-digit code sent to your email</div>
                                <TextField
                                    required
                                    fullWidth
                                    name="confirmationCode"
                                    label="Confirmation Code"
                                    placeholder="123456"
                                    value={confirmFormik.values.confirmationCode}
                                    onChange={confirmFormik.handleChange}
                                    error={confirmFormik.touched.confirmationCode && Boolean(confirmFormik.errors.confirmationCode)}
                                    helperText={confirmFormik.touched.confirmationCode && confirmFormik.errors.confirmationCode}
                                    autoFocus
                                />
                            </div>
                        </div>
                    </DialogContent>
                    {confirmFormik.isSubmitting ? (
                        <CircularLoading />
                    ) : (
                        <button
                            className={`btn btn-dark ${confirmFormik.isValid ? "" : "disabled"}`}
                            type="submit"
                            disabled={!confirmFormik.isValid}
                        >
                            Confirm
                        </button>
                    )}
                </form>
            )}
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </Dialog>
    );
}