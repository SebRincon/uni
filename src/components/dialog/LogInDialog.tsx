import { useState } from "react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, TextField, InputAdornment } from "@mui/material";
import Image from "next/image";
import * as yup from "yup";
import { signIn } from 'aws-amplify/auth';

import { LogInDialogProps } from "@/types/DialogProps";
import CircularLoading from "../misc/CircularLoading";
import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";

export default function LogInDialog({ open, handleLogInClose }: LogInDialogProps) {
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const router = useRouter();

    const validationSchema = yup.object({
        email: yup
            .string()
            .email("Enter a valid email")
            .required("Email is required."),
        password: yup
            .string()
            .min(8, "Password should be of minimum 8 characters length.")
            .max(100, "Password should be of maximum 100 characters length.")
            .required("Password is required."),
    });

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await signIn({ username: values.email, password: values.password });
                resetForm();
                handleLogInClose();
                router.push("/explore");
            } catch (error) {
                console.error('Error signing in:', error);
                setSnackbar({ message: (error as Error).message, severity: "error", open: true });
            }
        },
    });

    return (
        <Dialog className="dialog" open={open} onClose={handleLogInClose}>
            <Image className="dialog-icon" src="/assets/unicorn-head-purple.png" alt="" width={40} height={40} />
            <DialogTitle className="title">Sign in to Uni</DialogTitle>
            <form className="dialog-form" onSubmit={formik.handleSubmit}>
                <DialogContent>
                    <div className="input-group">
                        <div className="input">
                            <TextField
                                fullWidth
                                name="email"
                                label="Email"
                                type="email"
                                placeholder="email@example.com"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                error={formik.touched.email && Boolean(formik.errors.email)}
                                helperText={formik.touched.email && formik.errors.email}
                                autoFocus
                            />
                        </div>
                        <div className="input">
                            <TextField
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
                    </div>
                </DialogContent>
                {formik.isSubmitting ? (
                    <CircularLoading />
                ) : (
                    <button className="btn btn-dark" type="submit">
                        Log In
                    </button>
                )}
            </form>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </Dialog>
    );
}