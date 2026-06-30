import { CppFile } from '../types';

export const cppFiles: CppFile[] = [
  {
    id: 'game_instance_h',
    name: 'TaizGameInstance.h',
    path: 'Source/TaizOpenWorld/Core/GameInstance/TaizGameInstance.h',
    type: 'header',
    category: 'Core',
    purpose: 'Persistent global game manager that coordinates sub-systems, settings, and acts as the bridging authority between level loads.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "TaizGameInstance.generated.h"

class UTaizSaveSubsystem;

/**
 * Main persistent Game Instance for the Taiz Open World RPG
 */
UCLASS()
class TAIZOPENWORLD_API UTaizGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	UTaizGameInstance();

	virtual void Init() override;
	virtual void Shutdown() override;

	/** Triggers global save of active game state */
	UFUNCTION(BlueprintCallable, Category = "Taiz|SaveSystem")
	bool TriggerGlobalSave(const FString& SlotName, int32 UserIndex);

	/** Triggers global load from a saved game slot */
	UFUNCTION(BlueprintCallable, Category = "Taiz|SaveSystem")
	bool TriggerGlobalLoad(const FString& SlotName, int32 UserIndex);

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Settings")
	FString DefaultSaveSlotName;

private:
	UPROPERTY()
	UTaizSaveSubsystem* SaveSubsystem;
};`
  },
  {
    id: 'game_instance_cpp',
    name: 'TaizGameInstance.cpp',
    path: 'Source/TaizOpenWorld/Core/GameInstance/TaizGameInstance.cpp',
    type: 'source',
    category: 'Core',
    purpose: 'Implements persistent initialization, connecting core subsystems, and executing game-wide loading sequences.',
    code: `#include "TaizGameInstance.h"
#include "TaizOpenWorld/Systems/Save/TaizSaveSubsystem.h"
#include "Kismet/GameplayStatics.h"

UTaizGameInstance::UTaizGameInstance()
{
	DefaultSaveSlotName = TEXT("Taiz_AutoSave_Slot");
}

void UTaizGameInstance::Init()
{
	Super::Init();
	UE_LOG(LogTemp, Log, TEXT("TaizGameInstance: Initializing Lumen AI Cinematic Engine Systems..."));

	// Cache our Game Instance Save Subsystem
	SaveSubsystem = GetSubsystem<UTaizSaveSubsystem>();
	if (SaveSubsystem)
	{
		UE_LOG(LogTemp, Log, TEXT("TaizGameInstance: SaveSubsystem successfully loaded."));
	}
}

void UTaizGameInstance::Shutdown()
{
	UE_LOG(LogTemp, Log, TEXT("TaizGameInstance: Commencing safe system shutdown."));
	Super::Shutdown();
}

bool UTaizGameInstance::TriggerGlobalSave(const FString& SlotName, int32 UserIndex)
{
	if (SaveSubsystem)
	{
		FString TargetSlot = SlotName.IsEmpty() ? DefaultSaveSlotName : SlotName;
		return SaveSubsystem->SaveGameToSlot(TargetSlot, UserIndex);
	}
	return false;
}

bool UTaizGameInstance::TriggerGlobalLoad(const FString& SlotName, int32 UserIndex)
{
	if (SaveSubsystem)
	{
		FString TargetSlot = SlotName.IsEmpty() ? DefaultSaveSlotName : SlotName;
		return SaveSubsystem->LoadGameFromSlot(TargetSlot, UserIndex);
	}
	return false;
}`
  },
  {
    id: 'game_mode_h',
    name: 'TaizGameModeBase.h',
    path: 'Source/TaizOpenWorld/Core/GameMode/TaizGameModeBase.h',
    type: 'header',
    category: 'Core',
    purpose: 'Game rules definition, establishing default actor classes (Pawn, Controller, HUD, GameState) and handling player spawning.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TaizGameModeBase.generated.h"

/**
 * GameModeBase containing open world game rules and initialization defaults.
 */
UCLASS()
class TAIZOPENWORLD_API ATaizGameModeBase : public AGameModeBase
{
	GENERATED_BODY()

public:
	ATaizGameModeBase();

	virtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;
	virtual void StartPlay() override;

	/** Custom event triggered when the player transitions into a new district */
	UFUNCTION(BlueprintImplementableEvent, Category = "Taiz|LevelRules")
	void OnPlayerEnteredNewDistrict(const FName& DistrictName);
};`
  },
  {
    id: 'game_mode_cpp',
    name: 'TaizGameModeBase.cpp',
    path: 'Source/TaizOpenWorld/Core/GameMode/TaizGameModeBase.cpp',
    type: 'source',
    category: 'Core',
    purpose: 'Wires the defaults and logs initial level-loading parameters, binding classes at constructor phase.',
    code: `#include "TaizGameModeBase.h"
#include "TaizOpenWorld/Characters/Khalid/TaizPlayerCharacter.h"
#include "TaizOpenWorld/Core/GameInstance/TaizPlayerController.h"
#include "TaizOpenWorld/UI/TaizHUD.h"
#include "TaizOpenWorld/Core/GameState/TaizGameState.h"

ATaizGameModeBase::ATaizGameModeBase()
{
	// Bind our AAA C++ classes to default systems
	DefaultPawnClass = ATaizPlayerCharacter::StaticClass();
	PlayerControllerClass = ATaizPlayerController::StaticClass();
	HUDClass = ATaizHUD::StaticClass();
	GameStateClass = ATaizGameState::StaticClass();

	UE_LOG(LogTemp, Log, TEXT("TaizGameModeBase: Initialized class bindings successfully."));
}

void ATaizGameModeBase::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
	Super::InitGame(MapName, Options, ErrorMessage);
	UE_LOG(LogTemp, Warning, TEXT("TaizGameModeBase: Booting Map: %s with Options: %s"), *MapName, *Options);
}

void ATaizGameModeBase::StartPlay()
{
	Super::StartPlay();
	UE_LOG(LogTemp, Warning, TEXT("TaizGameMode: Taiz open-world level began. Setting active district..."));
}`
  },
  {
    id: 'player_controller_h',
    name: 'TaizPlayerController.h',
    path: 'Source/TaizOpenWorld/Core/GameInstance/TaizPlayerController.h',
    type: 'header',
    category: 'Core',
    purpose: 'Handles Enhanced Input mappings, mouse capturing rules, and local hud UI widgets creation.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "InputMappingContext.h"
#include "TaizPlayerController.generated.h"

/**
 * Handles input routing, input context layers, and UI mouse toggles.
 */
UCLASS()
class TAIZOPENWORLD_API ATaizPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	ATaizPlayerController();

	virtual void BeginPlay() override;
	virtual void SetupInputComponent() override;

	/** Returns default context layer */
	UFUNCTION(BlueprintPure, Category = "Taiz|Input")
	UInputMappingContext* GetDefaultMappingContext() const { return DefaultInputMappingContext; }

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputMappingContext* DefaultInputMappingContext;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	int32 MappingPriority = 0;
};`
  },
  {
    id: 'player_controller_cpp',
    name: 'TaizPlayerController.cpp',
    path: 'Source/TaizOpenWorld/Core/GameInstance/TaizPlayerController.cpp',
    type: 'source',
    category: 'Core',
    purpose: 'Injects the Enhanced Input local player subsystem to bind the input mapping context during BeginPlay.',
    code: `#include "TaizPlayerController.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"

ATaizPlayerController::ATaizPlayerController()
{
	// Enable standard tick rate and replication parameters for smooth camera handling
	bShowMouseCursor = false;
	bEnableClickEvents = true;
	bEnableMouseOverEvents = true;
}

void ATaizPlayerController::BeginPlay()
{
	Super::BeginPlay();

	// Setup Enhanced Input Subsystem inside local controller
	if (ULocalPlayer* LocalPlayer = Cast<ULocalPlayer>(Player))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(LocalPlayer))
		{
			if (DefaultInputMappingContext)
			{
				Subsystem->AddMappingContext(DefaultInputMappingContext, MappingPriority);
				UE_LOG(LogTemp, Log, TEXT("TaizPlayerController: Mapping Context added successfully with priority %d."), MappingPriority);
			}
			else
			{
				UE_LOG(LogTemp, Warning, TEXT("TaizPlayerController: DefaultInputMappingContext missing! Please bind in blueprint class."));
			}
		}
	}
}

void ATaizPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();
}`
  },
  {
    id: 'player_character_h',
    name: 'TaizPlayerCharacter.h',
    path: 'Source/TaizOpenWorld/Characters/Khalid/TaizPlayerCharacter.h',
    type: 'header',
    category: 'Characters',
    purpose: 'Declares camera spring arms, input action references, trace sweeps for interaction, and movement modifiers.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "TaizPlayerCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UInputAction;

UENUM(BlueprintType)
enum class ETaizMovementState : uint8
{
	Idle,
	Walking,
	Running,
	Sprinting,
	Crouching
};

UCLASS()
class TAIZOPENWORLD_API ATaizPlayerCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ATaizPlayerCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	/** Core Movement Functions */
	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartSprint();
	void StopSprint();
	void StartCrouch();
	void StopCrouch();
	void Interact();

	/** Inspection Trace Sweep */
	void CheckInteractionTarget();

	/** Getters */
	UFUNCTION(BlueprintPure, Category = "Taiz|Locomotion")
	ETaizMovementState GetCustomMovementState() const { return CurrentMovementState; }

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Taiz|Camera")
	USpringArmComponent* CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Taiz|Camera")
	UCameraComponent* FollowCamera;

	/** Enhanced Input Actions bindings */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputAction* MoveAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputAction* LookAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputAction* SprintAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputAction* CrouchAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Taiz|Input")
	UInputAction* InteractAction;

	/** Gameplay parameters */
	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Taiz|Locomotion")
	float WalkSpeed = 250.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Taiz|Locomotion")
	float RunSpeed = 500.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Taiz|Locomotion")
	float SprintSpeed = 800.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Taiz|Locomotion")
	float CrouchSpeed = 150.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Taiz|Interaction")
	float InteractionRange = 300.0f;

private:
	ETaizMovementState CurrentMovementState;
	AActor* FocusedInteractionActor;
};`
  },
  {
    id: 'player_character_cpp',
    name: 'TaizPlayerCharacter.cpp',
    path: 'Source/TaizOpenWorld/Characters/Khalid/TaizPlayerCharacter.cpp',
    type: 'source',
    category: 'Characters',
    purpose: 'Implements physics-based movement, crouch logic, sprinting speed modifications, and dynamic camera ray casting for interaction.',
    code: `#include "TaizPlayerCharacter.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/InputComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "DrawDebugHelpers.h"

ATaizPlayerCharacter::ATaizPlayerCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	// Set size for collision capsule
	GetCapsuleComponent()->InitCapsuleSize(42.f, 96.0f);

	// Configure character movement settings
	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	GetCharacterMovement()->bOrientRotationToMovement = true; 
	GetCharacterMovement()->RotationRate = FRotator(0.0f, 540.0f, 0.0f); 
	GetCharacterMovement()->JumpZVelocity = 600.f;
	GetCharacterMovement()->AirControl = 0.2f;
	GetCharacterMovement()->MaxWalkSpeed = RunSpeed;

	// Camera Boom (Pull-behind capsule for optimal view)
	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 400.0f; 
	CameraBoom->bUsePawnControlRotation = true; 

	// Follow Camera
	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName); 
	FollowCamera->bUsePawnControlRotation = false; 

	CurrentMovementState = ETaizMovementState::Idle;
	FocusedInteractionActor = nullptr;
}

void ATaizPlayerCharacter::BeginPlay()
{
	Super::BeginPlay();
	UE_LOG(LogTemp, Log, TEXT("TaizPlayerCharacter: Khalid Al-Shamiri ready in the open world."));
}

void ATaizPlayerCharacter::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	// Perform Raycast check for interactable objects in front of screen
	CheckInteractionTarget();

	// Update movement state based on speed vectors
	float VelocityMagnitude = GetVelocity().Size2D();
	if (VelocityMagnitude < 5.0f)
	{
		CurrentMovementState = ETaizMovementState::Idle;
	}
	else if (CurrentMovementState != ETaizMovementState::Crouching && CurrentMovementState != ETaizMovementState::Sprinting)
	{
		CurrentMovementState = (VelocityMagnitude > WalkSpeed + 5.0f) ? ETaizMovementState::Running : ETaizMovementState::Walking;
	}
}

void ATaizPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EnhancedInputComponent = CastChecked<UEnhancedInputComponent>(PlayerInputComponent))
	{
		// Bind Locomotion Inputs
		EnhancedInputComponent->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ATaizPlayerCharacter::Move);
		EnhancedInputComponent->BindAction(LookAction, ETriggerEvent::Triggered, this, &ATaizPlayerCharacter::Look);
		
		EnhancedInputComponent->BindAction(SprintAction, ETriggerEvent::Started, this, &ATaizPlayerCharacter::StartSprint);
		EnhancedInputComponent->BindAction(SprintAction, ETriggerEvent::Completed, this, &ATaizPlayerCharacter::StopSprint);

		EnhancedInputComponent->BindAction(CrouchAction, ETriggerEvent::Started, this, &ATaizPlayerCharacter::StartCrouch);
		EnhancedInputComponent->BindAction(CrouchAction, ETriggerEvent::Completed, this, &ATaizPlayerCharacter::StopCrouch);

		// Bind Interaction Input
		EnhancedInputComponent->BindAction(InteractAction, ETriggerEvent::Started, this, &ATaizPlayerCharacter::Interact);
	}
}

void ATaizPlayerCharacter::Move(const FInputActionValue& Value)
{
	FVector2D MovementVector = Value.Get<FVector2D>();

	if (Controller != nullptr)
	{
		// Find forward direction based on Camera rotation (Yank yaw only)
		const FRotator Rotation = Controller->GetControlRotation();
		const FRotator YawRotation(0, Rotation.Yaw, 0);

		// Get forward and right vectors
		const FVector ForwardDirection = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X);
		const FVector RightDirection = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y);

		// Apply movements
		AddMovementInput(ForwardDirection, MovementVector.Y);
		AddMovementInput(RightDirection, MovementVector.X);
	}
}

void ATaizPlayerCharacter::Look(const FInputActionValue& Value)
{
	FVector2D LookAxisVector = Value.Get<FVector2D>();

	if (Controller != nullptr)
	{
		AddControllerYawInput(LookAxisVector.X);
		AddControllerPitchInput(LookAxisVector.Y);
	}
}

void ATaizPlayerCharacter::StartSprint()
{
	if (CurrentMovementState != ETaizMovementState::Crouching)
	{
		CurrentMovementState = ETaizMovementState::Sprinting;
		GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
	}
}

void ATaizPlayerCharacter::StopSprint()
{
	if (CurrentMovementState == ETaizMovementState::Sprinting)
	{
		CurrentMovementState = ETaizMovementState::Running;
		GetCharacterMovement()->MaxWalkSpeed = RunSpeed;
	}
}

void ATaizPlayerCharacter::StartCrouch()
{
	CurrentMovementState = ETaizMovementState::Crouching;
	GetCharacterMovement()->MaxWalkSpeed = CrouchSpeed;
	Crouch();
}

void ATaizPlayerCharacter::StopCrouch()
{
	if (CurrentMovementState == ETaizMovementState::Crouching)
	{
		CurrentMovementState = ETaizMovementState::Running;
		GetCharacterMovement()->MaxWalkSpeed = RunSpeed;
		UnCrouch();
	}
}

void ATaizPlayerCharacter::Interact()
{
	if (FocusedInteractionActor)
	{
		// Trigger interface function or dispatch event to actor
		UE_LOG(LogTemp, Log, TEXT("TaizPlayerCharacter: Interacted with target %s"), *FocusedInteractionActor->GetName());
		// Implement interaction trigger event...
	}
}

void ATaizPlayerCharacter::CheckInteractionTarget()
{
	if (!Controller) return;

	FVector ViewLocation;
	FRotator ViewRotation;
	Controller->GetPlayerViewPoint(ViewLocation, ViewRotation);

	FVector TraceStart = ViewLocation;
	FVector TraceEnd = TraceStart + (ViewRotation.Vector() * InteractionRange);

	FHitResult HitResult;
	FCollisionQueryParams QueryParams;
	QueryParams.AddIgnoredActor(this);

	bool bHit = GetWorld()->LineTraceSingleByChannel(
		HitResult,
		TraceStart,
		TraceEnd,
		ECC_Visibility,
		QueryParams
	);

	if (bHit && HitResult.GetActor())
	{
		FocusedInteractionActor = HitResult.GetActor();
		// Visual indicator drawing in editor during debug
		// DrawDebugLine(GetWorld(), TraceStart, HitResult.ImpactPoint, FColor::Orange, false, -1.0f, 0, 1.0f);
	}
	else
	{
		FocusedInteractionActor = nullptr;
	}
}`
  },
  {
    id: 'hud_h',
    name: 'TaizHUD.h',
    path: 'Source/TaizOpenWorld/UI/TaizHUD.h',
    type: 'header',
    category: 'UI',
    purpose: 'Renders the crosshairs, contextual inspection cards, sub-widget screens and interacts with UMG widgets.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "TaizHUD.generated.h"

class UUserWidget;

/**
 * Renders crosshair, prompt indicators, and manages screen overlay widgets.
 */
UCLASS()
class TAIZOPENWORLD_API ATaizHUD : public AHUD
{
	GENERATED_BODY()

public:
	ATaizHUD();

	virtual void DrawHUD() override;
	virtual void BeginPlay() override;

	/** Displays interactive context prompt */
	UFUNCTION(BlueprintCallable, Category = "Taiz|HUD")
	void ShowInteractionPrompt(const FString& PromptText);

	/** Clears visual prompt */
	UFUNCTION(BlueprintCallable, Category = "Taiz|HUD")
	void ClearInteractionPrompt();

protected:
	UPROPERTY(EditDefaultsOnly, Category = "Taiz|UI")
	TSubclassOf<UUserWidget> InteractionWidgetClass;

private:
	UPROPERTY()
	UUserWidget* InteractionWidgetInstance;
};`
  },
  {
    id: 'hud_cpp',
    name: 'TaizHUD.cpp',
    path: 'Source/TaizOpenWorld/UI/TaizHUD.cpp',
    type: 'source',
    category: 'UI',
    purpose: 'Handles Canvas screen drawing for custom HUD overlays and sets up initial prompt widget containers.',
    code: `#include "TaizHUD.h"
#include "Blueprint/UserWidget.h"
#include "Engine/Canvas.h"

ATaizHUD::ATaizHUD()
{
	InteractionWidgetInstance = nullptr;
}

void ATaizHUD::BeginPlay()
{
	Super::BeginPlay();

	if (InteractionWidgetClass)
	{
		InteractionWidgetInstance = CreateWidget<UUserWidget>(GetOwningPlayerController(), InteractionWidgetClass);
		if (InteractionWidgetInstance)
		{
			InteractionWidgetInstance->AddToViewport();
			InteractionWidgetInstance->SetVisibility(ESlateVisibility::Collapsed);
		}
	}
}

void ATaizHUD::DrawHUD()
{
	Super::DrawHUD();

	// Draw subtle target dot in screen center
	if (Canvas)
	{
		FVector2D Center(Canvas->ClipX * 0.5f, Canvas->ClipY * 0.5f);
		FCanvasBoxItem Reticle(Center - FVector2D(2, 2), FVector2D(4, 4));
		Reticle.LineColor = FLinearColor(1.0f, 0.84f, 0.0f, 0.5f); // Gold tint
		Canvas->DrawItem(Reticle);
	}
}

void ATaizHUD::ShowInteractionPrompt(const FString& PromptText)
{
	if (InteractionWidgetInstance)
	{
		InteractionWidgetInstance->SetVisibility(ESlateVisibility::Visible);
		// Call custom blueprint event on widget to bind text
	}
}

void ATaizHUD::ClearInteractionPrompt()
{
	if (InteractionWidgetInstance)
	{
		InteractionWidgetInstance->SetVisibility(ESlateVisibility::Collapsed);
	}
}`
  },
  {
    id: 'game_state_h',
    name: 'TaizGameState.h',
    path: 'Source/TaizOpenWorld/Core/GameState/TaizGameState.h',
    type: 'header',
    category: 'Core',
    purpose: 'Coordinates real-time world systems: day-night loops, weather progression, active district multipliers, and prayer timings.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "TaizGameState.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDistrictChangedSignature, FName, NewDistrict);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPrayerTimeTriggeredSignature, int32, PrayerIndex);

UCLASS()
class TAIZOPENWORLD_API ATaizGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	ATaizGameState();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;

	/** Sets active geographical sector */
	UFUNCTION(BlueprintCallable, Category = "Taiz|WorldState")
	void SetCurrentDistrict(FName DistrictName);

	/** World cycle accessors */
	UFUNCTION(BlueprintPure, Category = "Taiz|WorldState")
	float GetInGameTimeOfDay() const { return InGameTimeOfDay; }

	UPROPERTY(BlueprintAssignable, Category = "Taiz|WorldEvents")
	FOnDistrictChangedSignature OnDistrictChanged;

	UPROPERTY(BlueprintAssignable, Category = "Taiz|WorldEvents")
	FOnPrayerTimeTriggeredSignature OnPrayerTimeTriggered;

protected:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Taiz|WorldCycle")
	float DayLengthInRealMinutes = 10.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Taiz|WorldCycle")
	float InGameTimeOfDay = 6.0f; // Starts at 6:00 AM

private:
	FName CurrentActiveDistrict;
	void HandleDayNightCycle(float DeltaTime);
};`
  },
  {
    id: 'game_state_cpp',
    name: 'TaizGameState.cpp',
    path: 'Source/TaizOpenWorld/Core/GameState/TaizGameState.cpp',
    type: 'source',
    category: 'Core',
    purpose: 'Drives the time variables and calculates prayer time triggers, emitting delegators globally to simulate the city.',
    code: `#include "TaizGameState.h"

ATaizGameState::ATaizGameState()
{
	PrimaryActorTick.bCanEverTick = true;
	CurrentActiveDistrict = TEXT("SouqAlQahira");
}

void ATaizGameState::BeginPlay()
{
	Super::BeginPlay();
	UE_LOG(LogTemp, Log, TEXT("TaizGameState: Level tracking initiated."));
}

void ATaizGameState::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	HandleDayNightCycle(DeltaTime);
}

void ATaizGameState::SetCurrentDistrict(FName DistrictName)
{
	if (CurrentActiveDistrict != DistrictName)
	{
		CurrentActiveDistrict = DistrictName;
		OnDistrictChanged.Broadcast(DistrictName);
		UE_LOG(LogTemp, Log, TEXT("TaizGameState: Player has entered District: %s"), *DistrictName.ToString());
	}
}

void ATaizGameState::HandleDayNightCycle(float DeltaTime)
{
	// Convert DeltaTime into in-game hours rate
	float HoursPerSecond = 24.0f / (DayLengthInRealMinutes * 60.0f);
	InGameTimeOfDay += DeltaTime * HoursPerSecond;

	// Cycle bound 24 hrs
	if (InGameTimeOfDay >= 24.0f)
	{
		InGameTimeOfDay = 0.0f;
		UE_LOG(LogTemp, Log, TEXT("TaizGameState: New Day Cycle Started."));
	}

	// Trigger prayer schedules check (Fajr ~5am, Dhuhr ~12pm, Asr ~3:30pm, Maghrib ~6:30pm, Isha ~8pm)
	static int32 LastTriggeredHour = -1;
	int32 CurrentHour = FMath::FloorToInt(InGameTimeOfDay);
	if (CurrentHour != LastTriggeredHour)
	{
		LastTriggeredHour = CurrentHour;
		if (CurrentHour == 5) OnPrayerTimeTriggered.Broadcast(0); // Fajr
		else if (CurrentHour == 12) OnPrayerTimeTriggered.Broadcast(1); // Dhuhr
		else if (CurrentHour == 15) OnPrayerTimeTriggered.Broadcast(2); // Asr
		else if (CurrentHour == 18) OnPrayerTimeTriggered.Broadcast(3); // Maghrib
		else if (CurrentHour == 20) OnPrayerTimeTriggered.Broadcast(4); // Isha
	}
}`
  },
  {
    id: 'save_game_h',
    name: 'TaizSaveGame.h',
    path: 'Source/TaizOpenWorld/Systems/Save/TaizSaveGame.h',
    type: 'header',
    category: 'Systems',
    purpose: 'Data schema definition containing serializable properties for storing character coordinates, reputation map, and story status.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame"
#include "TaizSaveGame.generated.h"

/**
 * AAA Save Game storage object for persistent variables
 */
UCLASS()
class TAIZOPENWORLD_API UTaizSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UTaizSaveGame();

	/** Save payload structures */
	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	FVector PlayerLocation;

	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	FRotator PlayerRotation;

	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	float InGameTime;

	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	int32 PlayerMoney;

	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	TMap<FName, float> DistrictReputation;

	UPROPERTY(VisibleAnywhere, Category = "SaveData")
	TArray<FName> CompletedQuests;
};`
  },
  {
    id: 'save_game_cpp',
    name: 'TaizSaveGame.cpp',
    path: 'Source/TaizOpenWorld/Systems/Save/TaizSaveGame.cpp',
    type: 'source',
    category: 'Systems',
    purpose: 'Initializes default values for the save file variables.',
    code: `#include "TaizSaveGame.h"

UTaizSaveGame::UTaizSaveGame()
{
	PlayerLocation = FVector(0.0f, 0.0f, 100.0f);
	PlayerRotation = FRotator::ZeroRotator;
	InGameTime = 8.0f; // Defaults back to morning 8 AM
	PlayerMoney = 5000; // Starting Yemeni Rials (YER)
	DistrictReputation.Add(TEXT("SouqAlQahira"), 50.0f);
}`
  },
  {
    id: 'save_subsystem_h',
    name: 'TaizSaveSubsystem.h',
    path: 'Source/TaizOpenWorld/Systems/Save/TaizSaveSubsystem.h',
    type: 'header',
    category: 'Systems',
    purpose: 'Subsystem manager for automating background threads, triggers, and disk-level binary read/write routines.',
    code: `// Copyright © 2026 Lumen AI Cinematic Engine. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "TaizSaveSubsystem.generated.h"

/**
 * Handles automation, slot loading, check-point triggers, and background file streaming.
 */
UCLASS()
class TAIZOPENWORLD_API UTaizSaveSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	/** Triggers disk save write */
	bool SaveGameToSlot(const FString& SlotName, int32 UserIndex);

	/** Triggers disk file read */
	bool LoadGameFromSlot(const FString& SlotName, int32 UserIndex);
};`
  },
  {
    id: 'save_subsystem_cpp',
    name: 'TaizSaveSubsystem.cpp',
    path: 'Source/TaizOpenWorld/Systems/Save/TaizSaveSubsystem.cpp',
    type: 'source',
    category: 'Systems',
    purpose: 'Subsystem execution utilizing GameplayStatics to stream binary structures to disk securely.',
    code: `#include "TaizSaveSubsystem.h"
#include "TaizSaveGame.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Character.h"

void UTaizSaveSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	UE_LOG(LogTemp, Log, TEXT("TaizSaveSubsystem: Subsystem initialized successfully."));
}

void UTaizSaveSubsystem::Deinitialize()
{
	UE_LOG(LogTemp, Log, TEXT("TaizSaveSubsystem: Deinitializing Save Subsystem..."));
	Super::Deinitialize();
}

bool UTaizSaveSubsystem::SaveGameToSlot(const FString& SlotName, int32 UserIndex)
{
	UTaizSaveGame* SaveGameInstance = Cast<UTaizSaveGame>(UGameplayStatics::CreateSaveGameObject(UTaizSaveGame::StaticClass()));
	if (!SaveGameInstance) return false;

	// Reference current active player character to record positional variables
	ACharacter* PlayerChar = UGameplayStatics::GetPlayerCharacter(GetWorld(), 0);
	if (PlayerChar)
	{
		SaveGameInstance->PlayerLocation = PlayerChar->GetActorLocation();
		SaveGameInstance->PlayerRotation = PlayerChar->GetActorRotation();
	}

	// Trigger Gameplay static async write
	return UGameplayStatics::SaveGameToSlot(SaveGameInstance, SlotName, UserIndex);
}

bool UTaizSaveSubsystem::LoadGameFromSlot(const FString& SlotName, int32 UserIndex)
{
	if (!UGameplayStatics::DoesSaveGameExist(SlotName, UserIndex))
	{
		UE_LOG(LogTemp, Warning, TEXT("TaizSaveSubsystem: Save Slot %s does not exist on disk!"), *SlotName);
		return false;
	}

	UTaizSaveGame* LoadedInstance = Cast<UTaizSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, UserIndex));
	if (!LoadedInstance) return false;

	// Teleport Player Actor to saved position safely
	ACharacter* PlayerChar = UGameplayStatics::GetPlayerCharacter(GetWorld(), 0);
	if (PlayerChar)
	{
		PlayerChar->SetActorLocationAndRotation(LoadedInstance->PlayerLocation, LoadedInstance->PlayerRotation, false, nullptr, ETeleportType::TeleportPhysics);
	}

	UE_LOG(LogTemp, Log, TEXT("TaizSaveSubsystem: Successfully loaded slot: %s"), *SlotName);
	return true;
}`
  }
];
