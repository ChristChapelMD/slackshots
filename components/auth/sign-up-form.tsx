"use client";

import { FormEvent, useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Eye, EyeClosed } from "@phosphor-icons/react";

import { useAuth } from "@/hooks/use-auth";

export default function SignUpForm() {
  const { signUp, loading, error } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [hasTyped, setHasTyped] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const validatePassword = (password: string) => {
    const passwordRules = [
      { regex: /.{8,}/, message: "Must be at least 8 characters" },
      { regex: /[A-Z]/, message: "Must include an uppercase letter" },
      { regex: /[a-z]/, message: "Must include a lowercase letter" },
      { regex: /\d/, message: "Must include a number" },
      {
        regex: /[!@#$%^&*]/,
        message: "Must include a special character (!@#$%^&*)",
      },
    ];

    for (const rule of passwordRules) {
      if (!rule.regex.test(password)) return rule.message;
    }

    return "";
  };

  const isFirstNameInvalid = !firstName.trim();
  const isLastNameInvalid = !lastName.trim();
  const isEmailInvalid = !/^\S+@\S+\.\S+$/.test(email);
  const passwordError = validatePassword(password);
  const isPasswordInvalid = passwordError !== "";
  const isConfirmPasswordInvalid = confirmPassword !== password;

  const isFormValid =
    !isFirstNameInvalid &&
    !isLastNameInvalid &&
    !isEmailInvalid &&
    !isPasswordInvalid &&
    !isConfirmPasswordInvalid;

  const disabled = loading || !isFormValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    await signUp({
      email,
      password,
      name: `${firstName} ${lastName}`,
      callbackURL: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex gap-4">
        <Input
          isRequired
          errorMessage={
            touched.firstName && isFirstNameInvalid
              ? "First name is required"
              : null
          }
          isInvalid={touched.firstName && isFirstNameInvalid}
          label="First Name"
          value={firstName}
          variant="faded"
          onBlur={() => {
            hasTyped.firstName
              ? setTouched((prev) => ({ ...prev, firstName: true }))
              : null;
          }}
          onChange={(e) => {
            setHasTyped((prev) => ({ ...prev, firstName: true }));
            setFirstName(e.target.value);
          }}
        />
        <Input
          isRequired
          errorMessage={
            touched.lastName && isLastNameInvalid
              ? "Last name is required"
              : null
          }
          isInvalid={touched.lastName && isLastNameInvalid}
          label="Last Name"
          value={lastName}
          variant="faded"
          onBlur={() => {
            hasTyped.lastName
              ? setTouched((prev) => ({ ...prev, lastName: true }))
              : null;
          }}
          onChange={(e) => {
            setHasTyped((prev) => ({ ...prev, lastName: true }));
            setLastName(e.target.value);
          }}
        />
      </div>
      <Input
        isRequired
        errorMessage={
          touched.email && isEmailInvalid ? "Please enter a valid email" : null
        }
        isInvalid={touched.email && isEmailInvalid}
        label="Email"
        type="email"
        value={email}
        variant="faded"
        onBlur={() => {
          hasTyped.email
            ? setTouched((prev) => ({ ...prev, email: true }))
            : null;
        }}
        onChange={(e) => {
          setHasTyped((prev) => ({ ...prev, email: true }));
          setEmail(e.target.value);
        }}
      />
      <Input
        isRequired
        endContent={
          <Button
            disableRipple
            isIconOnly
            className="bg-transparent hover:bg-default"
            isDisabled={!password.trim()}
            onPress={() => {
              setPasswordVisible(!passwordVisible);
            }}
          >
            {passwordVisible ? <Eye /> : <EyeClosed />}
          </Button>
        }
        errorMessage={
          touched.password && isPasswordInvalid ? passwordError : null
        }
        isInvalid={touched.password && isPasswordInvalid}
        label="Password"
        type={passwordVisible ? "text" : "password"}
        value={password}
        variant="faded"
        onBlur={() => {
          hasTyped.password
            ? setTouched((prev) => ({ ...prev, password: true }))
            : null;
        }}
        onChange={(e) => {
          setHasTyped((prev) => ({ ...prev, password: true }));
          setPassword(e.target.value);
        }}
      />
      <Input
        isRequired
        endContent={
          <Button
            disableRipple
            isIconOnly
            className="bg-transparent hover:bg-default"
            isDisabled={!confirmPassword.trim()}
            onPress={() => {
              setConfirmPasswordVisible(!confirmPasswordVisible);
            }}
          >
            {confirmPasswordVisible ? <Eye /> : <EyeClosed />}
          </Button>
        }
        errorMessage={
          touched.confirmPassword && isConfirmPasswordInvalid
            ? "Passwords must match"
            : null
        }
        isInvalid={
          (touched.confirmPassword || touched.password) &&
          (isConfirmPasswordInvalid || isPasswordInvalid)
        }
        label="Confirm Password"
        type={confirmPasswordVisible ? "text" : "password"}
        value={confirmPassword}
        variant="faded"
        onBlur={() => {
          hasTyped.confirmPassword
            ? setTouched((prev) => ({ ...prev, confirmPassword: true }))
            : null;
        }}
        onChange={(e) => {
          setHasTyped((prev) => ({ ...prev, confirmPassword: true }));
          setConfirmPassword(e.target.value);
        }}
      />
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <Button
        className="w-full rounded-lg px-4 py-3 text-white font-semibold disabled:opacity-50"
        color={disabled ? "default" : "primary"}
        isDisabled={disabled}
        isLoading={loading}
        type="submit"
      >
        {loading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  );
}
