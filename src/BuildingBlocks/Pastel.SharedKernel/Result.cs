namespace Pastel.SharedKernel;

/// <summary>Resultado de una operación sin valor. Los fallos esperables se devuelven, no se lanzan.</summary>
public class Result
{
    protected Result(bool isSuccess, Error? error)
    {
        if (isSuccess == (error is not null))
        {
            throw new ArgumentException("Un resultado exitoso no lleva error y uno fallido sí.", nameof(error));
        }

        IsSuccess = isSuccess;
        ErrorOrNull = error;
    }

    public bool IsSuccess { get; }

    public bool IsFailure => !IsSuccess;

    public Error? ErrorOrNull { get; }

    /// <summary>Error del resultado fallido. Lanza si el resultado fue exitoso (error de programación).</summary>
    public Error Error => ErrorOrNull ?? throw new InvalidOperationException("El resultado fue exitoso y no tiene error.");

    public static Result Success() => new(true, null);

    public static Result Failure(Error error) => new(false, error);

    public static Result<T> Success<T>(T value) => Result<T>.Success(value);

    public static Result<T> Failure<T>(Error error) => Result<T>.Failure(error);

    public static implicit operator Result(Error error) => Failure(error);
}

/// <summary>Resultado de una operación con valor.</summary>
public sealed class Result<T> : Result
{
    private readonly T? _value;

    private Result(T? value, Error? error)
        : base(error is null, error)
    {
        _value = value;
    }

    /// <summary>Valor del resultado exitoso. Lanza si el resultado fue fallido (error de programación).</summary>
    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("El resultado fallido no tiene valor.");

    public static Result<T> Success(T value) => new(value, null);

    public static new Result<T> Failure(Error error) => new(default, error);

    public static implicit operator Result<T>(T value) => Success(value);

    public static implicit operator Result<T>(Error error) => Failure(error);

    public Result<TOut> Map<TOut>(Func<T, TOut> map) =>
        IsSuccess ? Result<TOut>.Success(map(Value)) : Result<TOut>.Failure(Error);
}
