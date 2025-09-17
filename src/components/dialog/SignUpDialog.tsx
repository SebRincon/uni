import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { Dialog, DialogContent, DialogTitle, InputAdornment, TextField } from "@mui/material";
import * as yup from "yup";
import Image from "next/image";
import { signUp, signIn } from 'aws-amplify/auth';

import { SignUpDialogProps } from "@/types/DialogProps";
import CircularLoading from "../misc/CircularLoading";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";

export default function SignUpDialog({ open, handleSignUpClose }: SignUpDialogProps) {
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const router = useRouter();

    const validationSchema = yup.object({
        username: yup
            .string()
            .min(3, "Username should be of minimum 3 characters length.")
            .max(20, "Username should be of maximum 20 characters length.")
            .matches(/^[a-zA-Z0-9_]{1,14}[a-zA-Z0-9]$/, "Username is invalid")
            .required("Username is required."),
        password: yup
            .string()
            .min(8, "Password should be of minimum 8 characters length.")
            .max(100, "Password should be of maximum 100 characters length.")
            .required("Password is required."),
        name: yup.string().max(50, "Name should be of maximum 50 characters length."),
    });

    const formik = useFormik({
        initialValues: {
            username: "",
            password: "",
            name: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await signUp({
                    username: values.username,
                    password: values.password,
                    options: {
                        userAttributes: {
                            name: values.name,
                        },
                    },
                });
                // Optional: sign in the user directly after sign up
                await signIn({ username: values.username, password: values.password });
                resetForm();
                handleSignUpClose();
                router.push("/explore");
            } catch (error) {
                console.error('Error signing up:', error);
                setSnackbar({ message: (error as Error).message, severity: "error", open: true });
            }
        },
    });

    return (
        <Dialog className="dialog" open={open} onClose={handleSignUpClose}>
            <Image className="dialog-icon" src="/assets/favicon.png" alt="" width={40} height={40} />
            <DialogTitle className="title">Create your account</DialogTitle>
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
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </Dialog>
    );
}