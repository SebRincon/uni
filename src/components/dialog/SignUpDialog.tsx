import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { Dialog, DialogContent, DialogTitle, InputAdornment, TextField, MenuItem, Autocomplete, Chip } from "@mui/material";
import * as yup from "yup";
import Image from "next/image";
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';
import { updateUser } from "@/utilities/fetch";
import { universityOptions, majorOptions } from "@/constants/academics";

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
        university: yup.string().max(100),
        majors: yup.array().of(yup.string().max(100)).max(5),
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
            university: "",
            majors: [] as string[],
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
                    // Try to persist university/majors to our User model
                    try {
                        // small delay to allow DB user creation via auth hook
                        await new Promise(res => setTimeout(res, 500));
                        await updateUser(values.username, {
                            university: values.university || '',
                            majors: values.majors || [],
                        } as any);
                    } catch (e) {
                        console.warn('Could not immediately save university/majors after sign up:', e);
                    }
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
                
                // Try to persist university/majors to our User model
                try {
                    // small delay to allow DB user creation via auth hook
                    await new Promise(res => setTimeout(res, 500));
                    await updateUser(formik.values.username, {
                        university: formik.values.university || '',
                        majors: formik.values.majors || [],
                    } as any);
                } catch (e) {
                    console.warn('Could not immediately save university/majors after confirmation:', e);
                }
                
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
            <Image className="dialog-icon" src="/assets/favicon.png" alt="" width={40} height={40} />
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
                            <div className="input">
<TextField
                                    select
                                    fullWidth
                                    name="university"
                                    label="University"
                                    value={formik.values.university}
                                    onChange={formik.handleChange}
                                    SelectProps={{
                                        displayEmpty: true,
                                        renderValue: (selected) => {
                                            if (!selected) {
                                                return 'Select a university';
                                            }
                                            return selected as string;
                                        },
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {universityOptions.map((u) => (
                                        <MenuItem key={u} value={u}>{u}</MenuItem>
                                    ))}
                                </TextField>
                            </div>
                            <div className="input">
                                <Autocomplete
                                    multiple
                                    options={majorOptions}
                                    value={formik.values.majors}
                                    onChange={(_, value) => formik.setFieldValue('majors', value)}
                                    renderTags={(value: readonly string[], getTagProps) =>
                                        value.map((option: string, index: number) => (
                                            <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                                        ))
                                    }
renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Majors"
                                            placeholder={formik.values.majors.length > 0 ? '' : 'Select one or more majors'}
                                            helperText="You can select multiple majors"
                                        />
                                    )}
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