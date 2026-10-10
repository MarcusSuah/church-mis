<?php

namespace App\Logging;

use Illuminate\Log\Logger;
use Monolog\LogRecord;

/**
 * Masks secret-looking values in every log record's context and extra data:
 * passwords, tokens, secrets, API keys, cookies, authorization headers and
 * 2FA recovery codes. Attached to the file channels in config/logging.php.
 */
final class RedactSensitiveContext
{
    private const KEYS = '/pass(word)?|token|secret|authorization|cookie|recovery|api[_-]?key|two_factor/i';

    public function __invoke(Logger $logger): void
    {
        $monolog = $logger->getLogger();
        if (! $monolog instanceof \Monolog\Logger) {
            return;
        }

        $monolog->pushProcessor(
            fn (LogRecord $record): LogRecord => $record->with(
                context: $this->redact($record->context),
                extra: $this->redact($record->extra),
            )
        );
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return array<array-key, mixed>
     */
    private function redact(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key) && preg_match(self::KEYS, $key)) {
                $data[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $data[$key] = $this->redact($value);
            }
        }

        return $data;
    }
}
