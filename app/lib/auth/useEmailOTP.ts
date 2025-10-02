import {useCallback, useState} from 'react';

import {authClient} from './client';

interface UseEmailOTPOptions {
    email: string,
    onSuccess?: () => void,
    onError?: (error: string) => void,
}

export const useEmailOTP = ({
    email,
    onSuccess,
    onError,
}: UseEmailOTPOptions) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendOTP = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: 'email-verification', // Using email-verification type for dangerous actions
            });

            if (result.error) {
                const errorMessage = result.error.message || 'Failed to send OTP';

                setError(errorMessage);

                if (onError) {
                    onError(errorMessage);
                }

                return {success: false, error: errorMessage};
            }

            return {success: true};
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';

            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }

            return {success: false, error: errorMessage};
        } finally {
            setIsLoading(false);
        }
    }, [email, onError]);

    const verifyOTP = useCallback(async (otp: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await authClient.emailOtp.verifyEmail({
                email,
                otp,
            });

            if (result.error) {
                const errorMessage = result.error.message || 'Invalid OTP';

                setError(errorMessage);

                if (onError) {
                    onError(errorMessage);
                }

                return {success: false, error: errorMessage};
            }

            if (onSuccess) {
                onSuccess();
            }

            return {success: true};
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Invalid OTP';

            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }

            return {success: false, error: errorMessage};
        } finally {
            setIsLoading(false);
        }
    }, [
        email,
        onSuccess,
        onError,
    ]);

    return {
        sendOTP,
        verifyOTP,
        isLoading,
        error,
    };
};
